import { useId, useState } from 'react';
import { ArrowRight, ArrowDown, ArrowUpRight, Download, Github } from 'lucide-react';

const release = 'https://github.com/nicogoldberg1-rgb/opensourcing-release/blob/50f8fa47de186c80e35369460181deb2bcf27d99';
const app = 'https://github.com/nicogoldberg1-rgb/opensourcing/blob/396f338b655dc17407004d7c881d7886be940fcf';
const contributions = [
  { title:'Company records', source:'normalize.py', url:`${release}/skills/udu-source/lib/normalize.py`, type:'Conceptual inspiration', from:'A common shape for sourced company data.', to:'Consistent provider records', detail:'Shared TypeScript schemas and explicit missing values. Financial and contact extraction was not copied.', file:'shared/schema.ts' },
  { title:'Identity & duplicates', source:'merge.py', url:`${release}/skills/udu-source/lib/merge.py`, type:'Adapted behavior', from:'Normalize domains before matching companies.', to:'Provider identity with separate branches', detail:'The small domain-normalization routine was adapted to TypeScript with URL validation. Exact duplicates combine evidence; ambiguous identities are flagged.', file:'shared/normalize.ts' },
  { title:'Company screening', source:'screen-companies/SKILL.md', url:`${release}/skills/screen-companies/SKILL.md`, type:'Adapted instructions', from:'Explicit eligibility checks, reasons, and uncertainty.', to:'Pediatric service & location checks', detail:'Acquisition suitability becomes competitor relevance. Service evidence must apply to the clinic being evaluated.', file:'skills/screen-providers/SKILL.md · shared/screen.ts' },
  { title:'Staged sourcing', source:'run-cycle/SKILL.md', url:`${release}/skills/run-cycle/SKILL.md`, type:'Workflow adaptation', from:'Separate stages with saved outputs and review boundaries.', to:'Four connected research skills', detail:'Research → Screen → Compare → Brief. CLI artifacts carry results between skills; the public demo presents a prepared case.', file:'skills/ · cli/ · shared/research-artifacts.ts' },
  { title:'Research state', source:'lib/state.py', url:`${release}/lib/state.py`, type:'Conceptual inspiration', from:'Keep research context and run history explicit.', to:'Criteria, selections & saved artifacts', detail:'The static demo keeps session state in browser memory; the CLI saves local artifacts. No Python tracker code is shipped. Redis remains experimental.', file:'shared/schema.ts · src/App.tsx' },
  { title:'Workflow visibility', source:'cycles.ts', url:`${app}/server/src/lib/cycles.ts`, type:'Conceptual inspiration', from:'Expose stage outcomes and inspectable research activity.', to:'A guided, inspectable demo', detail:'Prepared discovery, evidence drawers, and visible handoffs replace the earlier run dashboard. No upstream React components or cycle parser were copied.', file:'src/components/ · src/App.tsx' },
];

export type AboutTab = 'overview' | 'contributions' | 'downloads';
const tabs = [['overview','How it works'],['contributions',"Nico Goldberg’s Contributions"],['downloads','Download skills']] as const;

export function About({ initialTab = 'overview' }: { initialTab?: AboutTab }) {
  const [tab,setTab]=useState<AboutTab>(initialTab);
  const id=useId();
  return <>
    <div className="about-tabs" role="tablist" aria-label="About Market Scout">
      {tabs.map(([value,label],index)=><button key={value} role="tab" id={`${id}-${value}`} aria-selected={tab===value} aria-controls={`${id}-panel`} tabIndex={tab===value?0:-1} onClick={()=>setTab(value)} onKeyDown={e=>{
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
        e.preventDefault();
        const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        setTab(tabs[next][0]);
        document.getElementById(`${id}-${tabs[next][0]}`)?.focus();
      }}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`} tabIndex={0} className="about-panel">
      {tab==='overview'?<>
        <p>Market Scout adapts Nicolas Goldberg’s modular sourcing approach into a market research workflow for an investment-team analyst.</p>
        <ol className="workflow-list">{[['Research','research-market','Collect providers and source passages using the assistant’s available tools.'],['Screen','screen-providers','Check service and geography rules with shared code. Keep uncertain claims visible.'],['Compare','compare-markets','Calculate differences across the reviewed samples.'],['Write','write-market-brief','Use the comparison and evidence to draft a sourced research brief.']].map(([title,skill,text])=><li key={skill}><strong>{title}</strong><code>{skill}</code><span>{text}</span></li>)}</ol>
        <p>The website is a prepared demonstration. Screening, selection, comparison, and exports work in your browser. Discovery candidates and all three research briefs were prepared beforehand. Briefs use the full reference case and stay the same when provider selections change.</p>
        <p>The illustrative clinic model was informed by <a href="https://www.oaklinlane.com/services" target="_blank" rel="noreferrer">Oaklin Lane’s published services</a>. This is not a commissioned TBD project or a statement about Oaklin Lane’s expansion plans.</p>
        <div className="actions"><button className="text-button" onClick={()=>{setTab('contributions');document.getElementById(`${id}-contributions`)?.focus();}}>Explore Nico’s contributions<ArrowRight size={15}/></button></div>
      </>:tab==='downloads'?<DownloadSkills/>:<>
        <a className="button secondary upstream-repo-link" href="https://github.com/nicogoldberg1-rgb/opensourcing-release" target="_blank" rel="noreferrer"><Github size={16} aria-hidden="true"/>Nico’s GitHub repository<ArrowUpRight size={14} aria-hidden="true"/></a>
        <h3>From sourcing businesses to comparing markets</h3>
        <p className="attribution-intro">Nico’s projects supplied a modular sourcing approach, instruction patterns, and a small domain-normalization routine. This map shows what Market Scout adapted and what it built around those ideas.</p>
        <div className="attribution-map" aria-label="Upstream contribution map">
          <div className="attribution-map-heading" aria-hidden="true"><strong>Nico’s sourcing projects</strong><span/><strong>Market Scout</strong></div>
          {contributions.map(item=><section className="attribution-row" key={item.title} aria-label={`${item.title}: ${item.type}`}>
            <div><h4>{item.title}</h4><p>{item.from}</p><a href={item.url} target="_blank" rel="noreferrer">{item.source}</a></div>
            <div className="attribution-connector" aria-hidden="true"><ArrowRight size={20} className="attribution-arrow-right"/><ArrowDown size={20} className="attribution-arrow-down"/></div>
            <div><h4>{item.to}</h4><span className="attribution-type">{item.type}</span><p>{item.detail}</p><code>{item.file}</code></div>
          </section>)}
        </div>
        <section className="attribution-additions"><h3>Built for Market Scout</h3><p>Evidence scope and provenance · Branch-aware screening · Human decisions separate from assessments · Company and market counts · Snapshot briefs with citations · Safe CSV exports · The React interface.</p></section>
        <details className="attribution-details"><summary>Source versions, licenses & other references</summary><p>Links above point to the inspected versions: <code>opensourcing-release @ 50f8fa4</code> and <code>opensourcing @ 396f338</code>.</p><p>Nico’s <a href={`${app}/web/src/components/Layout.tsx`} target="_blank" rel="noreferrer">navigation layout</a> and <a href={`${app}/web/src/pages/Home.tsx`} target="_blank" rel="noreferrer">task panels</a> also informed the interface conceptually. Other layout references were <a href="https://github.com/twentyhq/twenty/blob/main/packages/twenty-docs/getting-started/core-concepts/layout.mdx" target="_blank" rel="noreferrer">Twenty</a> and <a href="https://github.com/tremorlabs/template-dashboard-oss" target="_blank" rel="noreferrer">Tremor</a>; the interface code is original, with design guidance from Impeccable.</p><p>Acquisition filtering, contact enrichment, outreach, and sequence activation are not included. Market Scout is independent and does not claim affiliation with Nico.</p><p>The applicable MIT license is preserved in <a href="/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">Third-party notices</a>. The original offline Python data-preparation script is Market Scout’s own work.</p><a href="/attribution.md" target="_blank" rel="noreferrer">Read the full attribution record</a></details>
      </>}
    </div>
  </>;
}

function DownloadSkills() {
  return <div className="skills-download">
    <h3>A research workflow for your own markets</h3>
    <p>Four connected skills to research businesses, screen evidence, compare markets, and write a sourced brief. Choose your industry, locations, and criteria; Austin–San Antonio pediatric therapy is one example configuration.</p>
    <div className="actions skills-download-actions">
      <a className="button primary" href="/market-scout-skills.zip" download><Download size={16} aria-hidden="true"/>Download skills</a>
      <a className="button secondary" href="https://github.com/drat-git/market-scout" target="_blank" rel="noreferrer"><Github size={16} aria-hidden="true"/>GitHub repository<ArrowUpRight size={14} aria-hidden="true"/></a>
    </div>
    <p className="skills-bundle-note">ZIP includes all four skills, the SOP, setup guides, and example cases. Clone the GitHub repository to run the complete workflow with the Market Scout CLI.</p>

    <section className="skills-setup" aria-labelledby="skills-setup-title">
      <h3 id="skills-setup-title">Get started</h3>
      <ol>
        <li><strong>Set up the project.</strong><p>Open the full repository in Codex. With Node.js 22 or newer installed, run <code>npm ci</code> from the project root.</p></li>
        <li><strong>Install the four skills.</strong><p>Unzip the bundle and copy the four folders inside <code>skills/</code> into the project’s <code>.agents/skills/</code> folder. Open a new Codex session so it can discover them.</p></li>
        <li><strong>Start with your business question.</strong><p>Ask Codex to use <code>research-market</code> with your industry and markets. It helps define a case and collect sources, then hands off to <code>screen-providers</code>, <code>compare-markets</code>, and <code>write-market-brief</code>.</p></li>
      </ol>
      <p className="skills-guide-note">Inside the bundle: <code>docs/CLI.md</code> covers setup and commands, <code>docs/SOP.md</code> explains the research process, and <code>docs/CASE-CONFIG.md</code> shows how to configure your own case.</p>
    </section>

    <details className="skills-limitations">
      <summary>Disclaimers &amp; limitations</summary>
      <ul>
        <li>The bundle contains instructions and examples, not a standalone app. The CLI must run from the full project checkout.</li>
        <li>Research uses the assistant’s available browsing tools and your supplied material. The core workflow makes no paid API calls itself; assistant access and usage limits still apply.</li>
        <li>Checks validate structure and apply your rules. They do not prove a source is accurate, a sample is complete, or a market is attractive. Review evidence and candidate selections before using a brief.</li>
        <li>Results stay in local files and do not update this prepared dashboard. The HVAC example is fictional and intended for practice.</li>
        <li>Codex is the tested workflow. Claude Code installation is documented using <code>.claude/skills/</code>, but has not been independently validated.</li>
      </ul>
    </details>

    <section className="skills-roadmap" aria-labelledby="skills-roadmap-title">
      <div className="skills-section-heading"><h3 id="skills-roadmap-title">Future capabilities</h3><span className="planned-label">Planned</span></div>
      <p>Proposed additions to connect the local research workflow with the dashboard.</p>
      <dl>
        <div><dt>Full dashboard integration</dt><dd>Open cases and skill outputs in the app, inspect research runs, and carry review decisions and briefs between both interfaces.</dd></div>
        <div><dt>Guided dataset imports</dt><dd>Map compatible CSV and spreadsheet columns into research records while preserving source references and unresolved evidence.</dd></div>
        <div><dt>Scheduled evidence refresh</dt><dd>Revisit saved sources and present changes for an analyst to review before updating a comparison or brief.</dd></div>
      </dl>
    </section>
  </div>;
}
