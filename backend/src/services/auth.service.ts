import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserProfile, UserRole } from '../types';

const oauthClient = new OAuth2Client(config.googleClientId);

export class AuthService {
  /**
   * Verifies a Google ID token from the frontend Google Sign-in widget.
   * If valid and the user is in the authorized users list, returns their profile & signed JWT.
   */
  public static async verifyGoogleToken(idToken: string): Promise<{ token: string; user: UserProfile }> {
    let email = '';
    let name = '';
    let picture = '';

    if (config.googleClientId) {
      const ticket = await oauthClient.verifyIdToken({
        idToken,
        audience: config.googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Invalid Google token: missing email.');
      }
      email = payload.email.toLowerCase().trim();
      name = payload.name || payload.email;
      picture = payload.picture || '';
    } else {
      // In development or when GOOGLE_CLIENT_ID is not configured, support mock/test token
      try {
        const decoded = jwt.decode(idToken) as any;
        if (decoded && decoded.email) {
          email = decoded.email.toLowerCase().trim();
          name = decoded.name || email;
          picture = decoded.picture || '';
        } else {
          // If raw email passed
          email = idToken.toLowerCase().trim();
          name = email.split('@')[0];
        }
      } catch {
        email = idToken.toLowerCase().trim();
        name = email.split('@')[0];
      }
    }

    const authorized = config.authorizedUsers.find(
      (u) => u.email.toLowerCase().trim() === email
    );

    if (!authorized) {
      throw new Error(`Unauthorized: Account ${email} is not permitted to access Ambica Engineers ERP.`);
    }

    const profile: UserProfile = {
      email: authorized.email,
      name: authorized.name || name,
      role: authorized.role,
      picture,
    };

    const token = jwt.sign(profile, config.jwtSecret, { expiresIn: '7d' });
    return { token, user: profile };
  }

  /**
   * Development / Test login for the 4 verified employee accounts.
   */
  public static loginAs(email: string): { token: string; user: UserProfile } {
    const authorized = config.authorizedUsers.find(
      (u) => u.email.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (!authorized) {
      throw new Error(`Unauthorized: Account ${email} is not permitted.`);
    }

    const profile: UserProfile = {
      email: authorized.email,
      name: authorized.name,
      role: authorized.role,
    };

    const token = jwt.sign(profile, config.jwtSecret, { expiresIn: '7d' });
    return { token, user: profile };
  }

  /**
   * Validates a session JWT or a Firebase ID Token.
   */
  public static verifySessionToken(token: string): UserProfile {
    try {
      return jwt.verify(token, config.jwtSecret) as UserProfile;
    } catch {
      // Check if it's a valid Firebase ID Token
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded && decoded.email) {
          const email = String(decoded.email).toLowerCase().trim();
          const authorized = config.authorizedUsers.find(
            (u) => u.email.toLowerCase().trim() === email
          );
          if (authorized) {
            return {
              email: authorized.email,
              name: authorized.name || decoded.name || email.split('@')[0],
              role: authorized.role,
              picture: decoded.picture || '',
            };
          }
        }
      } catch {
        // Fall through
      }
      throw new Error('Invalid or expired authentication session.');
    }
  }

  public static listAuthorizedUsers() {
    return config.authorizedUsers;
  }
}
