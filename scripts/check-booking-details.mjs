import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Exercise the production payload functions, without sending mail or writing a live sheet.
const html=readFileSync(new URL('../booking.html',import.meta.url),'utf8');
function extract(name){
  const start=html.indexOf(`function ${name}(`);
  assert.ok(start>=0,`${name} exists`);
  const end=html.indexOf('\nfunction ',start+1);
  return html.slice(start,end);
}
const fields=Object.fromEntries(Object.entries({date:'2026-10-01',time:'780|13:00',name:'Test Guest',email:'test@example.com',phone:'',note:'Please use gentle pressure.',website:''}).map(([key,value])=>[key,{value}]));
fields.sameRoom={checked:true};
const course={key:'body60',min:60,price:3980,en:'Body Relaxation — 60 min'};
let addons=[{key:'head',min:10,price:1000,en:'Dry head care',ja:'目まわり・ヘッドケア'}];
let nomination={key:'therapist',price:500,en:'Therapist nomination',ja:'スタッフ指名'};
let serial=0;
const ctx=vm.createContext({console,$:id=>fields[id],selectedCourse:()=>course,selectedAddons:()=>addons,selectedNomination:()=>nomination,timeLabel:()=> '13:00',guests:'2',lang:'en',FIRST_UTM:{},FORM_STARTED_AT:new Date(Date.now()-5000).toISOString(),submissionId:()=>`id-${++serial}`,webSubmissionId:'',webSubmissionSignature:'',money:n=>`¥${n.toLocaleString('en-US')}`,document:{querySelector:()=>null}});
for(const name of ['sameRoomRequested','bookingSelectionDetails','bookingRequestNote','webSubmissionSignatureValue','stableWebSubmissionId','webPayload']){
  if(html.includes(`function ${name}(`))vm.runInContext(extract(name),ctx);
}
const first=vm.runInContext('webPayload()',ctx);
assert.equal(first.addons?.[0]?.id,'head','web submission must retain the selected add-on');
assert.equal(first.nomination?.id,'therapist','web submission must retain nomination');
assert.equal(first.sameRoomRequested,true,'same-room request must reach the server');
assert.equal(first.treatmentMinutes,70,'head care adds ten minutes');
assert.match(first.note,/head/,'legacy server note must also preserve selected add-on');
assert.match(first.note,/same.room/i,'legacy server note must also preserve room request');
assert.ok(first.note.endsWith('Please use gentle pressure.'),'customer note is preserved');
assert.equal(vm.runInContext('webPayload()',ctx).submissionId,first.submissionId,'an unchanged retry uses the same ID');
addons=[{key:'hotstone20',min:20,price:2000,en:'Hot stone',ja:'ホットストーン'}];
const changed=vm.runInContext('webPayload()',ctx);
assert.notEqual(changed.submissionId,first.submissionId,'changing add-ons must change submission identity');
assert.equal(changed.treatmentMinutes,80,'20-minute hot stone adds twenty minutes');
nomination={key:'none',price:0,en:'No nomination'};
assert.notEqual(vm.runInContext('webPayload()',ctx).submissionId,changed.submissionId,'changing nomination must change identity');
ctx.guests='1';
assert.equal(vm.runInContext('webPayload()',ctx).sameRoomRequested,false,'one guest cannot retain a hidden same-room request');
fields.note.value='長'.repeat(300);
assert.ok(vm.runInContext('webPayload()',ctx).note.endsWith('長'.repeat(300)),'payload builder must never silently truncate customer notes');

const backend=vm.createContext({console,Date,Utilities:{DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...createHash('sha256').update(s).digest()]}});
vm.runInContext(readFileSync(new URL('../docs/google-apps-script/Code.gs',import.meta.url),'utf8'),backend);
const payload={...first,submissionId:'123e4567-e89b-42d3-a456-426614174000'};
backend.raw=payload;
const valid=vm.runInContext('validatePayload_(raw)',backend);
assert.equal(valid.addons[0].id,'head');
assert.equal(valid.sameRoomRequested,true);
backend.a=valid;backend.b={...valid,note:'Changed request',addons:[{id:'hotstone20',label:'Hot stone',minutes:20,price:2000}]};
assert.notEqual(vm.runInContext('bookingFingerprint_(a)',backend),vm.runInContext('bookingFingerprint_(b)',backend),'different selections cannot be silently deduplicated');
const row=['', '',valid.lang, valid.courseId,valid.courseLabel,valid.date,valid.time,valid.guests,valid.name,valid.email,valid.phone,valid.note,'','','','','sent','recorded_mail_sent'];
backend.row=row;
assert.equal(vm.runInContext('bookingRowMatches_(row,a)',backend),true,'legacy 18-column row remains readable');
assert.equal(vm.runInContext('bookingRowMatches_(row,b)',backend),false,'changed request differs from prior row');
const mail=vm.runInContext('buildBookingMail_(a)',backend).body;
assert.match(mail,/Dry head care/);
assert.match(mail,/Therapist nomination/);
assert.match(mail,/same room|same-room/i);
assert.match(mail,/70/);
backend.raw={...payload,addons:[{id:'bad',label:'invalid',minutes:-10,price:1000}]};
assert.throws(()=>vm.runInContext('validatePayload_(raw)',backend),'invalid add-on duration is rejected');
console.log('Booking details passed: payload, legacy notes, changed-request identity, duration, server validation, deduplication and mail.');
