import { DomainError } from '@company-os/kernel';
export type Applicability = 'applicable' | 'not_applicable' | 'unknown';
export type RuleValue = string | number | boolean;
export interface EqualsCondition { readonly op: 'equals'; readonly field: string; readonly value: RuleValue; }
export interface InCondition { readonly op: 'in'; readonly field: string; readonly values: readonly RuleValue[]; }
export type RuleCondition = EqualsCondition | InCondition;
export interface ComplianceRuleDefinition { readonly id: string; readonly version: number; readonly effectiveFrom: string; readonly effectiveTo?: string; readonly conditions: readonly RuleCondition[]; readonly outcome: Exclude<Applicability, 'unknown'>; }
export class PublishedRuleVersion {
  private constructor(readonly definition: Readonly<ComplianceRuleDefinition>) {}
  static publish(definition: ComplianceRuleDefinition): PublishedRuleVersion {
    if (!/^RULE-[A-Z0-9-]{3,64}$/.test(definition.id) || !Number.isInteger(definition.version) || definition.version < 1) throw new DomainError('INVALID_RULE_IDENTITY', 'Rule ID and version are invalid');
    if (!Number.isFinite(Date.parse(definition.effectiveFrom)) || definition.conditions.length > 20) throw new DomainError('INVALID_RULE_DEFINITION', 'Rule date or condition count is invalid');
    for (const condition of definition.conditions) { if (!/^[a-z][a-zA-Z0-9.]{0,63}$/.test(condition.field)) throw new DomainError('INVALID_RULE_FIELD', 'Rule field is invalid'); if (condition.op === 'in' && (condition.values.length < 1 || condition.values.length > 50)) throw new DomainError('INVALID_RULE_VALUES', 'Rule values are unbounded'); }
    return new PublishedRuleVersion(Object.freeze({ ...definition, conditions: Object.freeze([...definition.conditions]) }));
  }
  evaluate(context: Readonly<Record<string, RuleValue | undefined>>, at: string): Applicability {
    const evaluatedAt = Date.parse(at); const from = Date.parse(this.definition.effectiveFrom); const to = this.definition.effectiveTo === undefined ? undefined : Date.parse(this.definition.effectiveTo);
    if (!Number.isFinite(evaluatedAt) || evaluatedAt < from || (to !== undefined && evaluatedAt >= to)) return 'not_applicable';
    for (const condition of this.definition.conditions) { const actual = context[condition.field]; if (actual === undefined) return 'unknown'; const matches = condition.op === 'equals' ? actual === condition.value : condition.values.includes(actual); if (!matches) return 'not_applicable'; }
    return this.definition.outcome;
  }
}
