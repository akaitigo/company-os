import { DomainError, type EntityId, type TenantId } from '@company-os/kernel';
export type DataClassification = 'C1' | 'C2' | 'C3' | 'C4';
export interface DocumentVersion {
  readonly version: number;
  readonly objectKey: string;
  readonly sha256: string;
  readonly createdAt: string;
  readonly createdBy: EntityId;
}
export class DocumentRecord {
  private readonly versions: DocumentVersion[] = [];
  constructor(
    readonly id: EntityId,
    readonly tenantId: TenantId,
    readonly classification: DataClassification,
    readonly retentionRuleId: string,
  ) {
    if (!/^RET-[A-Z0-9-]{3,64}$/.test(retentionRuleId))
      throw new DomainError('INVALID_RETENTION_RULE', 'Document requires a retention rule ID');
  }
  addVersion(version: Omit<DocumentVersion, 'version'>): DocumentVersion {
    if (!/^[a-f0-9]{64}$/.test(version.sha256))
      throw new DomainError('INVALID_DOCUMENT_HASH', 'Document requires SHA-256');
    if (
      version.objectKey.length < 1 ||
      version.objectKey.length > 512 ||
      version.objectKey.startsWith('/')
    )
      throw new DomainError('INVALID_OBJECT_KEY', 'Object key is invalid');
    const saved = Object.freeze({ ...version, version: this.versions.length + 1 });
    this.versions.push(saved);
    return saved;
  }
  snapshot(): { versions: readonly DocumentVersion[] } {
    return { versions: [...this.versions] };
  }
}
export type DispositionState = 'retained' | 'eligible' | 'approved' | 'destroyed';
export class RetentionDisposition {
  private state: DispositionState = 'retained';
  private legalHold = false;
  constructor(
    readonly resourceId: EntityId,
    readonly retainUntil: string,
  ) {
    if (!Number.isFinite(Date.parse(retainUntil)))
      throw new DomainError('INVALID_RETENTION_DATE', 'Retention date is invalid');
  }
  evaluate(at: string): void {
    if (Date.parse(at) >= Date.parse(this.retainUntil)) this.state = 'eligible';
  }
  placeLegalHold(): void {
    this.legalHold = true;
  }
  releaseLegalHold(): void {
    this.legalHold = false;
  }
  approve(): void {
    if (this.state !== 'eligible' || this.legalHold)
      throw new DomainError('DISPOSITION_BLOCKED', 'Disposition is not eligible or is held');
    this.state = 'approved';
  }
  destroy(): void {
    if (this.state !== 'approved' || this.legalHold)
      throw new DomainError(
        'DESTRUCTION_BLOCKED',
        'Destruction requires approval and no legal hold',
      );
    this.state = 'destroyed';
  }
  snapshot(): { state: DispositionState; legalHold: boolean } {
    return { state: this.state, legalHold: this.legalHold };
  }
}
