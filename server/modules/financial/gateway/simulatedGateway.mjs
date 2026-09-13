export class SimulatedGateway {
  constructor(options = {}) {
    this.gatewayName = options.gatewayName || 'SIMULATED_GATEWAY';
    this.processingDelay = options.processingDelay || 1000;
    this.successRate = options.successRate || 0.95;
  }

  async processPayment(paymentData) {
    const {
      transactionId,
      studentId,
      amount,
      paymentMethod,
      obligationId,
      metadata = {}
    } = paymentData;

    await this.simulateProcessing();

    const isSuccess = Math.random() < this.successRate;

    if (isSuccess) {
      const gatewayReference = this.generateReference();
      return {
        success: true,
        gatewayReference,
        status: 'SUCCESS',
        amount,
        transactionId,
        processedAt: new Date().toISOString(),
        metadata: {
          ...metadata,
          gatewayResponse: 'APPROVED',
          authorizationCode: this.generateAuthCode()
        }
      };
    } else {
      const failureReason = this.getRandomFailureReason();
      return {
        success: false,
        gatewayReference: this.generateReference(),
        status: 'FAILED',
        amount,
        transactionId,
        processedAt: new Date().toISOString(),
        failureReason,
        metadata: {
          ...metadata,
          gatewayResponse: 'DECLINED',
          declineCode: this.getDeclineCode(failureReason)
        }
      };
    }
  }

  async simulateProcessing() {
    const delay = this.processingDelay + Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  generateReference() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SIM-TXN-${timestamp}-${random}`;
  }

  generateAuthCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  getRandomFailureReason() {
    const reasons = [
      'INSUFFICIENT_FUNDS',
      'CARD_DECLINED',
      'EXPIRED_CARD',
      'INVALID_CARD_NUMBER',
      'TRANSACTION_LIMIT_EXCEEDED',
      'NETWORK_ERROR',
      'BANK_UNAVAILABLE',
      'SUSPECTED_FRAUD'
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  getDeclineCode(reason) {
    const codes = {
      'INSUFFICIENT_FUNDS': '51',
      'CARD_DECLINED': '05',
      'EXPIRED_CARD': '54',
      'INVALID_CARD_NUMBER': '14',
      'TRANSACTION_LIMIT_EXCEEDED': '61',
      'NETWORK_ERROR': '91',
      'BANK_UNAVAILABLE': '92',
      'SUSPECTED_FRAUD': '59'
    };
    return codes[reason] || '96';
  }

  getGatewayName() {
    return this.gatewayName;
  }
}

export const simulatedGateway = new SimulatedGateway();