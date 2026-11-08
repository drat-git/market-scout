import { Check, CircleHelp, PencilLine, X } from 'lucide-react';
import { screeningDetails, type VerificationCheck } from '../../shared/screen';
import type { Criteria, Dataset } from '../../shared/schema';
import { Result } from './Shared';

export function VerificationActions({ canRemoveFlag, flagRemoved, onToggleFlag }: { canRemoveFlag: boolean; flagRemoved: boolean; onToggleFlag: () => void }) {
  const hasFlagHistory = canRemoveFlag || flagRemoved;
  return <div className="verification-flag-control">
    <div><strong>{flagRemoved ? 'List flag removed' : hasFlagHistory ? 'Needs verification' : 'Verification'}</strong>
      <div className="verification-actions">
        {hasFlagHistory && <button className="button secondary" onClick={onToggleFlag}>{flagRemoved ? 'Restore flag' : 'Remove flag'}</button>}
        <button className="future-control verification-edit" disabled title="Planned: manually verify screening checks and record the supporting evidence"><PencilLine size={14} aria-hidden="true"/>Edit verification<span className="planned-label">Planned</span></button>
      </div>
    </div>
  </div>;
}

function Checks({ checks }: { checks: VerificationCheck[] }) {
  return <ul className="verification-checks">{checks.map(check => {
    const Icon = check.state === 'yes' ? Check : check.state === 'no' ? X : CircleHelp;
    return <li key={check.id} className={`verification-${check.state}`}><Icon size={17} aria-hidden="true"/><div><strong>{check.label}<span>{check.state === 'yes' ? 'Confirmed' : check.state === 'no' ? 'Does not meet requirement' : 'Not confirmed'}</span></strong><p>{check.detail}</p>{check.nextStep && <p className="verification-next"><b>Next step:</b> {check.nextStep}</p>}{check.evidenceIds.length > 0 && <div className="check-sources">{check.evidenceIds.map((id,i)=><a key={id} href={`#source-${id}`}>Source {i+1}</a>)}</div>}</div></li>;
  })}</ul>;
}
export function Verification({ data, relationshipId, criteria }: { data: Dataset; relationshipId: string; criteria: Criteria }) {
  const details = screeningDetails(data, relationshipId, criteria);
  return <section className="drawer-section verification-section" data-tour="checks"><h3>Screening checks</h3><Result result={details.result}/><p>{details.result === 'match' ? 'At least one location meets all selected requirements.' : details.result === 'exclude' ? 'Saved sources establish a disqualifying condition.' : 'Clinic-level evidence is incomplete.'}</p>{details.blockers.length > 0 && <Checks checks={details.blockers}/>} {details.groups.map(group=><div className="verification-location" key={group.id}><h4>{group.name}</h4><Checks checks={group.checks}/></div>)}</section>;
}
