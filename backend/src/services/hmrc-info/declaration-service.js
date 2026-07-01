export class HMRCDeclarationInformationService {
  constructor(companyId) {
    this.companyId = companyId;
  }

  async fetchDeclarationByMrn(mrn) {
    // Minimal stub implementation for local development.
    return {
      mrn,
      id: `stub-${mrn}`,
      status: 'UNKNOWN',
      createdAt: new Date().toISOString(),
      source: 'hmrc-stub'
    };
  }
}

export default HMRCDeclarationInformationService;
