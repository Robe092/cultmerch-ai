import { it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { matchedQlooInsights } from '../lib/analysis-summary';
import { displayAnalysisEn } from '../lib/display-en';
import type { ABComparisonResult } from '../types';
const fixture=()=>JSON.parse(fs.readFileSync(new URL('./fixtures/stored-analysis.synthetic.json',import.meta.url),'utf8')).result as ABComparisonResult;
it('highlights only evidence used by selected products, deduplicates and omits names already in the brief',()=>{
 const a=fixture();const sample=a.branchB_with_qloo.items[0];
 const e={...sample.qloo_evidence![0],name:'Our Legacy'};
 const items=[{...sample,qloo_evidence:[e,{...e,name:'Jazz'}]},{...sample,qloo_evidence:[e]}];
 assert.deepEqual(matchedQlooInsights('Fans of Jazz',items),['Our Legacy']);
 assert.deepEqual(matchedQlooInsights('Jazz',[]),[]);
});
it('historic display repairs the summary without removing unmatched provenance or changing the saved record',()=>{
 const a=fixture();const e=a.branchB_with_qloo.items[0].qloo_evidence![0];
 a.branchB_with_qloo.items[0].qloo_evidence=[{...e,name:'Our Legacy'}];
 a.provenance!.signals.push({...e,id:'unmatched-review-regression',name:'Seafood Chowder'});
 a.comparison_metrics.qloo_unique_insights=['Seafood Chowder'];
 const before=structuredClone(a),b=displayAnalysisEn(a);
 assert.ok(!b.comparison_metrics.qloo_unique_insights.includes('Seafood Chowder'));
 assert.ok(b.comparison_metrics.qloo_unique_insights.includes('Our Legacy'));
 assert.deepEqual(a,before);
 assert.deepEqual(b.provenance!.signals,a.provenance!.signals);
 assert.deepEqual(b.branchB_with_qloo.metrics,a.branchB_with_qloo.metrics);
});
