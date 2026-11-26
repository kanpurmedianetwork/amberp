import { config } from '../config';

class Mutex {
  private mutex = Promise.resolve();

  lock(): Promise<() => void> {
    let begin: (unlock: () => void) => void = () => {};
    this.mutex = this.mutex.then(() => {
      return new Promise(begin);
    });
    return new Promise((res) => {
      begin = res;
    });
  }
}

export class SequenceService {
  private static mutex = new Mutex();
  private static reservedEnquiry: number | null = null;
  private static reservedQuotation: number | null = null;
  private static reservedOrder: number | null = null;
  private static reservedPI: number | null = null;

  /**
   * Atomically allocates the next Enquiry number (e.g. ENR-002819)
   */
  public static async getNextEnquiryNumber(currentMax: number): Promise<string> {
    const unlock = await this.mutex.lock();
    try {
      const base = this.reservedEnquiry !== null ? Math.max(currentMax, this.reservedEnquiry) : currentMax;
      const nextNum = base + 1;
      this.reservedEnquiry = nextNum;
      return `${config.prefixes.enquiry}${String(nextNum).padStart(6, '0')}`;
    } finally {
      unlock();
    }
  }

  /**
   * Atomically allocates the next Quotation number (e.g. AELPL/26-27/188)
   */
  public static async getNextQuotationNumber(currentMax: number): Promise<string> {
    const unlock = await this.mutex.lock();
    try {
      const base = this.reservedQuotation !== null ? Math.max(currentMax, this.reservedQuotation) : currentMax;
      const nextNum = Math.max(base + 1, 6);
      this.reservedQuotation = nextNum;
      return `${config.prefixes.quotation}${String(nextNum).padStart(3, '0')}`;
    } finally {
      unlock();
    }
  }

  /**
   * Atomically allocates the next Order number (e.g. AE/26-27/O180)
   */
  public static async getNextOrderNumber(currentMax: number): Promise<string> {
    const unlock = await this.mutex.lock();
    try {
      const base = this.reservedOrder !== null ? Math.max(currentMax, this.reservedOrder) : currentMax;
      const nextNum = base + 1;
      this.reservedOrder = nextNum;
      return `${config.prefixes.order}${nextNum}`;
    } finally {
      unlock();
    }
  }

  /**
   * Atomically allocates the next PI number (e.g. AELPL/26-27/188)
   */
  public static async getNextPINumber(currentMax: number): Promise<string> {
    const unlock = await this.mutex.lock();
    try {
      const base = this.reservedPI !== null ? Math.max(currentMax, this.reservedPI) : currentMax;
      const nextNum = Math.max(base + 1, 6);
      this.reservedPI = nextNum;
      return `${config.prefixes.pi}${String(nextNum).padStart(3, '0')}`;
    } finally {
      unlock();
    }
  }

  public static syncSequence(type: 'enquiry' | 'quotation' | 'order' | 'pi', num: number) {
    if (type === 'enquiry') this.reservedEnquiry = Math.max(this.reservedEnquiry || 0, num);
    if (type === 'quotation') this.reservedQuotation = Math.max(this.reservedQuotation || 0, num);
    if (type === 'order') this.reservedOrder = Math.max(this.reservedOrder || 0, num);
    if (type === 'pi') this.reservedPI = Math.max(this.reservedPI || 0, num);
  }
}
