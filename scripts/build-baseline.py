"""Rebuild the versioned draft from builder-reviewed primary-page extracts.
No network calls. Human sign-off remains a separate release gate.
"""
import json
from pathlib import Path
from datetime import datetime, timezone

STAMP = '2026-11-06T00:34:09Z'
UPDATE_STAMP = '2026-11-06T01:20:01Z'
CONTEXT = json.loads(Path('data/market-context.json').read_text())
D = dict(schemaVersion='1', version='2026-11-06.draft-2', collectedAt=UPDATE_STAMP, humanReview='pending', markets=[], companies=[], locations=[], serviceAreas=[], relationships=[], evidence=[], limitations=[
    'This is a purposive research sample, not comprehensive market coverage. The draft contains ten company–market records in each metro, representing nineteen unique companies because one operates in both metros.',
    'Independent analyst review of the baseline and example brief is pending. Provider claims are source-checked descriptions, not independently audited clinical capabilities.',
    'Documented locations are a lower bound. General service menus are not assigned to every branch. Company ownership, capacity, payer participation, referrals, and financial performance were not researched.',
    '2024 ACS one-year estimates describe the full metros, not therapy demand. Population is a controlled estimate with no applicable sampling margin of error; other reported margins use 90% confidence.'
], researchLog=[
    dict(name="Children’s Therapeutics of Austin",url='https://childrenstherapeutics.com/',outcome='unresolved',reason='Primary homepage timed out; contact page returned 502. Search snippets are insufficient for a verified service claim. Not included to fill the ten-company target.'),
    dict(name='Building Bridges Therapy Clinic (RGV)',url='https://buildingbridgesrgv.com/',outcome='excluded',reason='Discovery returned San Juan and Alton clinics rather than a documented Austin or San Antonio clinic. Excluded from this baseline, without asserting the company has no other locations.')
])
for mid,name,metro,code,counties in [
 ('austin','Austin','Austin–Round Rock–San Marcos, TX','12420',['Bastrop','Caldwell','Hays','Travis','Williamson']),
 ('san-antonio','San Antonio','San Antonio–New Braunfels, TX','41700',['Atascosa','Bandera','Bexar','Comal','Guadalupe','Kendall','Medina','Wilson'])]:
    context = CONTEXT['markets'][code]
    assert counties == context['counties'], 'County definition drift requires review'
    D['markets'].append(dict(id=mid, name=name, cbsa=code, **context))

def company(cid,name,site,note=None):
    D['companies'].append(dict(id=cid,name=name,website=site,domain=site.split('//')[1].strip('/').removeprefix('www.'),origin='baseline',identityNote=note))

def ev(cid,scope,sid,suffix,url,title,passage,facts,claim,note=None):
    eid=f'e-{cid}-{suffix}'
    D['evidence'].append(dict(id=eid,companyId=cid,scope=scope,scopeId=sid,facts=facts,supports=True,claim=claim,url=url,title=title,passage=passage,collectedAt=STAMP,sourceType='provider',verification='source-checked',provenance='baseline',uncertainty=note))
    return eid

def clinic(cid,mid,name,address,url,title,passage,services=None,note=None,pediatric=True):
    lid=f'{cid}-{mid}-{len([l for l in D["locations"] if l["companyId"]==cid])+1}'
    facts=['physical-presence']+(['pediatric'] if pediatric else [])+['service:'+s for s in services or []]
    eid=ev(cid,'location',lid,lid,url,title,passage,facts, f'{name} is documented in {mid}. '+('The clinic page supports '+', '.join(services)+'.' if services else 'Services at this particular branch require confirmation.'),note)
    D['locations'].append(dict(id=lid,companyId=cid,marketId=mid,name=name,address=address,evidenceIds=[eid],note=note))
    return lid

def service(cid,lid,url,title,passage,services,note=None):
    return ev(cid,'location' if lid else 'company',lid or cid,'services'+('-'+lid if lid else ''),url,title,passage,['pediatric']+['service:'+s for s in services],'Published pediatric offerings: '+', '.join(services)+'.',note)

company('achieve','Achieve Pediatric Therapy','https://achievepediatrics.com/', 'One company with separately documented Cedar Park and San Antonio branches.')
for mid,name,addr,path in [('austin','Cedar Park','1320 Arrow Point Dr, Suite 413, Cedar Park, TX 78613','cedar-park'),('san-antonio','Stone Oak','21126 Market Ridge, San Antonio, TX 78258','san-antonio')]:
    clinic('achieve',mid,name,addr,f'https://achievepediatrics.com/{path}/',f'ACHIEVE {name}', 'Occupational, Physical, and Speech therapists ... for each child. '+ ('1320 Arrow Point Dr. Suite 413 Cedar Park, TX 78613' if mid=='austin' else '21126 Market Ridge San Antonio, TX 78258'), ['speech','occupational','physical'])
company('acs',"Austin’s Communication Station",'https://acskids.com/')
clinic('acs','austin','Shoal Creek','7800 Shoal Creek Blvd, Suite 110W, Austin, TX 78757','https://acskids.com/',"Austin’s Communication Station",'7800 Shoal Creek Blvd, Suite 110W, Austin, TX 78757 … pediatric Speech, Social and Occupational Therapy clinic', ['speech','occupational'])
company('kidworks','KidWorks Therapy Services','https://kidworkstherapy.com/')
clinic('kidworks','austin','South-Central Austin',None,'https://kidworkstherapy.com/','KidWorks Therapy Services','Occupational, Speech, and Physical Therapists … Our clinic is housed on a tree shaded hill in South-Central Austin', ['speech','occupational','physical'], 'Clinic presence is explicit; a street address has not been collected.')
company('kidventures','KidVentures Therapy Services','https://www.kidventurestherapy.com/')
clinic('kidventures','austin','Bee Caves Road','5524 Bee Caves Road, Building L, Austin, TX 78746','https://www.kidventurestherapy.com/','KidVentures Therapy Services','5524 Bee Caves Road Building L Austin, Texas 78746 … Occupational Therapy … Speech-Language Pathology', ['speech','occupational'])
company('tesoros','Little Tesoros Therapy Services','https://littletesoros.com/')
service('tesoros',None,'https://littletesoros.com/','Little Tesoros Therapy Services','provides physical, occupational and speech therapy within the fun, playful atmosphere of our clinic', ['speech','occupational','physical'], 'Company service menu is not a verified service roster for each branch.')
clinic('tesoros','austin','North Austin','9101 Burnet Road, Suite 103, Austin, TX 78758','https://littletesoros.com/contact','Contact — Little Tesoros','9101 Burnet Road, Suite 103 Austin, Texas 78758',note='Branch-level therapy availability needs confirmation.')
clinic('tesoros','austin','Cedar Park','1301 Medical Parkway, Suite 130, Cedar Park, TX 78613','https://littletesoros.com/contact','Contact — Little Tesoros','1301 Medical Parkway, Suite 130 Cedar Park, Texas 78613',note='Branch-level therapy availability needs confirmation.')
company('kidtherapy','KidTherapy','https://www.kidtherapyaustin.com/')
lid=clinic('kidtherapy','austin','Menchaca Road','4607 Menchaca Road, Austin, TX 78745','https://www.kidtherapyaustin.com/contact-us/','Contact Us — KidTherapy','Our Location: 4607 Menchaca Road, Austin, TX 78745')
service('kidtherapy',lid,'https://www.kidtherapyaustin.com/','KidTherapy Austin','English/Spanish bilingual pediatric therapy services. … Occupational Therapy … Physical Therapy … Speech Therapy … feeding abilities. … sensory integration', ['speech','occupational','physical','feeding','sensory'])
company('capital','Capital Area Speech & O.T.','https://capitalareaspeech.com/')
clinic('capital','austin','Ranch Road 620','13620 Ranch Rd 620 N, Building A, Suite 110, Austin, TX 78717','https://capitalareaspeech.com/about-us/','About Us — Capital Area Speech & O.T.','Speech and Occupational Therapy Specialists … 13620 Ranch Rd 620 N, Austin TX, 78717 Building A, Suite 110',['speech','occupational'])
company('lineleader','Line Leader Pediatric Therapy','https://www.lineleadertherapy.com/')
clinic('lineleader','austin','North Central Austin',None,'https://www.lineleadertherapy.com/','Line Leader Pediatric Therapy','Speech, Occupational, Physical, & Feeding Therapy for Children. … therapy center conveniently located in north central Austin, TX.', ['speech','occupational','physical','feeding'], 'Street address not captured; the primary page explicitly identifies its Austin therapy center.')
company('sol','Sol Speech & Language Therapy','https://solspeechandlanguage.com/')
lid=clinic('sol','austin','Centre Creek','1812 Centre Creek Dr, Suite 121, Austin, TX 78754','https://solspeechandlanguage.com/contact/','Contact Sol Speech & Language Therapy','1812 Centre Creek Dr. Suite 121 Austin, TX 78754')
service('sol',lid,'https://solspeechandlanguage.com/','Sol Speech & Language Therapy','With clinics offering speech therapy in Austin and Round Rock, TX … Whether you’re a child or an adult', ['speech'])

company('mighty-kids','Mighty Kids Therapy','https://www.mightykidstherapy.com/')
lid=clinic('mighty-kids','austin','Round Rock','4010 Sandy Brook Dr, Suite 201, Round Rock, TX 78665','https://www.mightykidstherapy.com/contact','Contact — Mighty Kids Therapy','4010 Sandy Brook Dr., Ste 201 … Round Rock, TX 78665',pediatric=False)
service('mighty-kids',lid,'https://www.mightykidstherapy.com/','Mighty Kids Therapy — Round Rock','Physical, Occupational, Speech, & Aquatic Therapy … Round Rock, TX … treating the whole child … therapies under one roof', ['speech','occupational','physical'], 'The homepage names the Round Rock clinic and describes therapies under one roof; the contact page supplies its address.')
for e in D['evidence']:
    if e['companyId'] == 'mighty-kids': e['collectedAt'] = UPDATE_STAMP

company('healthlink','Baptist Health System · Healthlink','https://www.baptisthealthsystem.com/')
clinic('healthlink','san-antonio','Healthlink Pediatric Clinic','525 Oak Centre Dr, Suite 440, San Antonio, TX 78258','https://www.baptisthealthsystem.com/locations/detail/healthlink-pediatric-clinic','Healthlink Pediatric Clinic','Pediatric Physical Therapy … Pediatric Occupational Therapy … Pediatric Speech Therapy … 525 Oak Centre Dr, Suite 440 … San Antonio, TX 78258', ['speech','occupational','physical'])
company('brighton','Brighton Center','https://brightonsa.org/')
clinic('brighton','san-antonio','Pediatric Therapy Clinic',None,'https://brightonsa.org/pediatric-therapy-services-3-6/','Brighton Pediatric Therapy Services','Our San Antonio-based Pediatric Therapy Clinic … speech, occupational, and physical therapy services', ['speech','occupational','physical'], 'Page alternates birth–6 and ages 3–6. Confirm eligibility. Campus addresses in the footer are not assigned to this clinic without a specific link.')
company('christus','CHRISTUS Children’s','https://www.christushealth.org/')
clinic('christus','san-antonio','Barlite Rehabilitation','7390 Barlite Blvd, Suite 120, San Antonio, TX 78224','https://www.christushealth.org/locations/childrens-rehab-barlite','CHRISTUS Children’s Rehabilitation','7390 Barlite Blvd. Suite 120, San Antonio, TX 78224 … Speech Therapy Evaluation … Physical Therapy Evaluation … Occupational Therapy Evaluation', ['speech','occupational','physical'])
company('university','University Health','https://www.universityhealth.com/')
clinic('university','san-antonio','Robert B. Green Campus','903 W. Martin Street, San Antonio, TX 78207','https://www.universityhealth.com/pediatrics/services/rehabilitation','Pediatric Rehabilitation — University Health','primary pediatric rehabilitation clinic for outpatient physical therapy treatments and speech therapy. … 903 W. Martin Street San Antonio,TX 78207', ['speech','physical'], 'OT is stated at system level but not established for this branch. Other system addresses have not been assigned services.')
company('teamcare','TeamCare Rehab','https://teamcarerehab.com/')
service('teamcare',None,'https://teamcarerehab.com/pediatrics/','Pediatrics — TeamCare Rehab','physical, occupational and speech therapy … treating pediatric patients in San Antonio', ['speech','occupational','physical'], 'The contact address may be an administrative office; a pediatric treatment clinic is not confirmed.')
area='teamcare-sa-coverage'
eid=ev('teamcare','service-area',area,'coverage','https://teamcarerehab.com/pediatrics/','Pediatrics — TeamCare Rehab','treating pediatric patients in San Antonio',['coverage','pediatric','service:speech','service:occupational','service:physical'],'The pediatric service page documents San Antonio coverage, without confirming clinic treatment at the office address.')
D['serviceAreas'].append(dict(id=area,companyId='teamcare',marketId='san-antonio',evidenceIds=[eid]))
company('pts','Pediatric Therapy Specialists','https://pedts.com/')
service('pts',None,'https://pedts.com/','Pediatric Therapy Specialists','Individual OT, PT & Speech Therapies … Sensory Integration … SOS Feeding Approach', ['speech','occupational','physical','feeding','sensory'], 'General services are company-wide; branch-specific availability is not established.')
# Same-page short excerpts remain under 25 quoted words combined; addresses are paraphrased fields.
clinic('pts','san-antonio','San Antonio Northwest','4600 Lockhill-Selma, Suite 101, San Antonio, TX 78249','https://pedts.com/','Pediatric Therapy Specialists','San Antonio (Northwest)',note='Company-wide service menu only.')
clinic('pts','san-antonio','Schertz Northeast','5700 Schertz Parkway, Suite 100, Schertz, TX 78154','https://pedts.com/','Pediatric Therapy Specialists','Schertz (Northeast)',note='Company-wide service menu only.')
company('pta','Pediatric Therapy Associates','https://www.pediatrictherapyassoc.com/')
clinic('pta','san-antonio','Village Drive','8527 Village Drive, Suite 107, San Antonio, TX 78217','https://www.pediatrictherapyassoc.com/our-services.html','Services We Provide — Pediatric Therapy Associates','Occupational Therapy … Physical Therapy … Speech Therapy … 8527 Village Drive Suite 107 San Antonio, Texas 78217', ['speech','occupational','physical'], 'An older directory returned an Austin Highway address. The provider’s current service-page address takes precedence; relocation not independently confirmed.')
company('kinspire','Kinspire Therapy','https://kinspiretherapy.com/')
clinic('kinspire','san-antonio','Blanco Road','7254 Blanco Rd, Suite 209, San Antonio, TX 78216','https://kinspiretherapy.com/contact.html','Contact — Kinspire Therapy','7254 Blanco Rd, Suite 209 San Antonio, TX 78216 … Hands-on occupational therapy for babies and children in San Antonio.', ['occupational'])
company('atc','Autism Treatment Center','https://www.atcoftexas.org/')
clinic('atc','san-antonio','Nacogdoches Therapy Clinic','15911 Nacogdoches, San Antonio, TX 78247','https://www.atcoftexas.org/sanantonio.html','Autism Treatment Center — San Antonio','Therapy Clinic 15911 Nacogdoches San Antonio, TX 78247 … Therapy - ABA, Speech, Occupational', ['speech','occupational'], 'Separate ABA-only clinic is not counted as an eligible therapy location. Confirm branch service availability before operational planning.')
for c in D['companies']:
    for mid in ['austin','san-antonio']:
        scopes=[x for x in D['locations']+D['serviceAreas'] if x['companyId']==c['id'] and x['marketId']==mid]
        if scopes:
            D['relationships'].append(dict(id=c['id']+'@'+mid,companyId=c['id'],marketId=mid,evidenceIds=[eid for x in scopes for eid in x['evidenceIds']]))
Path('data/baseline.json').write_text(json.dumps(D,indent=2,ensure_ascii=False)+'\n')
print(f"Draft: {len(D['companies'])} companies, {len(D['relationships'])} market relationships, {len(D['locations'])} locations, {len(D['evidence'])} evidence records")
