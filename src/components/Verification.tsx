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
    {hasFlagHistory && <p>A * after the provider name marks a manually removed flag. You can restore it here at any time. Saved evidence and screening checks stay unchanged.</p>}
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
  return <section className="drawer-section verification-section"><h3>Screening checks</h3><Result result={details.result}/><p>{details.result === 'match' ? 'At least one location meets all selected requirements.' : details.result === 'exclude' ? 'Saved sources establish a disqualifying condition.' : 'The research cannot yet confirm every requirement at one location. This does not mean the provider lacks these services.'}</p><p className="small">These checks use your current Screening rules and saved source passages. Including a provider in the comparison does not change its verification status.</p>{details.blockers.length > 0 && <Checks checks={details.blockers}/>} {details.groups.map(group=><div className="verification-location" key={group.id}><h4>{group.name}</h4><Checks checks={group.checks}/></div>)}<details className="verification-method"><summary>What counts as evidence, and what would AI look for?</summary><p>Evidence is a saved passage from the provider’s website with a source link and the company or clinic it describes. The checks look for pediatric care, a qualifying location, and the selected services at that same location.</p><p>An AI-connected research step would inspect service and location pages, save supporting passages, and flag missing or conflicting claims for verification. This demo checks saved research; it does not browse or call AI.</p><p>Company-wide service menus do not prove that every branch offers a service. Unverified claims and conflicting sources cannot confirm a requirement. A missing map pin is a separate address-matching issue.</p></details></section>;
}
