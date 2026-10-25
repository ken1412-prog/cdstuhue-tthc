import importlib.util
import json
import subprocess
import unittest
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('sync_public',ROOT/'scripts'/'sync_public.py')
SYNC=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SYNC)

class SiteTests(unittest.TestCase):
    def test_pages_and_navigation(self):
        for name in ['index.html','hoi-dap.html']:
            soup=BeautifulSoup((ROOT/'site'/name).read_text(encoding='utf-8'),'html.parser')
            self.assertEqual(soup.html.get('lang'),'vi')
            links={x.get('data-view') for x in soup.select('[data-view]')}
            self.assertGreaterEqual(len(links),10)
            self.assertTrue({'overview','units','chinh-thuc','tam-thoi','nhan-xet','dang-phi',
                             'qa-tthc','qa-stdv','qa-csdl','reports','resources','guide'}.issubset(links))
    def test_no_private_data_in_public_files(self):
        for path in (ROOT/'site').rglob('*'):
            if not path.is_file():continue
            if path.suffix in ('.html','.js','.css','.json'):
                s=path.read_text(encoding='utf-8')
                self.assertNotIn('1OZgFV1Urhy0u3fTl98psR8P3M_htv4F8PB94eDMej3w',s)
                self.assertNotIn('Messages r158',s)
    def test_empty_publication(self):
        qa=json.loads((ROOT/'site/data/approved.json').read_text())
        progress=json.loads((ROOT/'site/data/progress.json').read_text())
        self.assertEqual(qa['items'],[])
        self.assertEqual(progress['records'],[])
    def test_sync_rejects_non_public(self):
        feed={'schema':1,'items':[{'id':'QA001','group':'tthc','question':'Q','answer':'A','public':False}]}
        with self.assertRaises(ValueError):SYNC.validate(feed)
    def test_sync_keeps_only_public_fields(self):
        feed={'schema':1,'generatedAt':'2026-10-23T12:00:00Z', 'items':[
            {'id':'QA001','group':'tthc','question':'Nội dung đã duyệt','answer':'Trả lời duyệt',
             'public':True,'internalMessage':'BÍ MẬT','sourceUrl':'javascript:alert(1)'}]}
        out=SYNC.validate(feed)
        item=out['items'][0]
        self.assertNotIn('internalMessage',item)
        self.assertEqual(item['sourceUrl'],'')
        self.assertEqual(item['question'],'Nội dung đã duyệt')
    def test_sync_duplicate_and_schema(self):
        payload={'id':'QA001','group':'tthc','question':'Q','answer':'A','public':True}
        with self.assertRaises(ValueError):SYNC.validate({'schema':1,'items':[payload,payload]})
        with self.assertRaises(ValueError):SYNC.validate({'schema':9,'items':[]})
    def test_finance_publication_fail_closed(self):
        empty=SYNC.validate_finance({'schema':1,'public':False,'reviewed':False})
        self.assertFalse(empty['public'])
        with self.assertRaises(ValueError):SYNC.validate_finance({
            'schema':1,'public':True,'reviewed':True,'period':'2026-10','observedAt':'2026-10-24',
            'source':'Báo cáo đã duyệt', 'reportRecords':True,'bankGroups':[]})

    def test_finance_publication_strips_private_fields(self):
        payload={'schema':1,'public':True,'reviewed':True,'period':'2026-10',
            'observedAt':'2026-10-24','source':'Báo cáo tổng hợp đã duyệt',
            'reportRecords':100,'notDeclared':None,'waitingApproval':0,'waitingPayment':None,
            'bankGroups':[{'name':'Chi bộ','accounts':25,'private':'DO NOT PUBLISH'}],
            'internalAccount':'Dữ liệu nhạy cảm'}
        result=SYNC.validate_finance(payload)
        self.assertEqual(result['reportRecords'],100)
        self.assertNotIn('internalAccount',result)
        self.assertEqual(result['bankGroups'],[{'name':'Chi bộ','accounts':25}])

    def test_procedure_guides_and_approved_finance_tab(self):
        js=(ROOT/'site/assets/app.js').read_text(encoding='utf-8')
        script=(ROOT/'apps-script/Code.gs').read_text(encoding='utf-8')
        self.assertIn('procedureGuideView()',js)
        self.assertIn('WEB_FINANCE_PUBLIC',script)
        self.assertIn("kind==='finance'",script)

    def test_stats_level2_rankings_and_no_private_columns(self):
        js=(ROOT/'site/assets/app.js').read_text(encoding='utf-8')
        gs=(ROOT/'apps-script/Code.gs').read_text(encoding='utf-8')
        sync=(ROOT/'scripts/sync_public.py').read_text(encoding='utf-8')
        self.assertIn('payment-table-viewport',js)
        self.assertIn('Top 10 nhiều nhất',js)
        self.assertIn('Top 10 ít nhất',js)
        self.assertNotIn("m.missing.rowsByParent.slice(0,20)",js)
        self.assertIn("getRange(2,2,size,1)",gs)
        self.assertIn("getRange(2,4,size,1)",gs)
        self.assertIn("matched+unmatched===modules.missing.rowCount",gs)
        self.assertIn('approved_missing_level2',sync)
        self.assertNotIn('Các khu vực liên quan',js)
    def test_qa_detail_actions_after_copy_button_removal(self):
        js=(ROOT/'site/assets/app.js').read_text(encoding='utf-8')
        for page in ('index.html','hoi-dap.html'):
            html=(ROOT/'site'/page).read_text(encoding='utf-8')
            self.assertIn('id="qaModal"',html)
            self.assertIn('id="closeModal"',html)
            self.assertNotIn('id="copyLinkBtn"',html)
        self.assertIn('data-qa="${E(x.id)}"',js)
        self.assertIn("if(node.dataset.qa){openQA(node.dataset.qa);return}",js)
        self.assertIn("$('#closeModal').onclick=closeQA",js)
        self.assertNotIn("$('#copyLinkBtn')",js)

    def test_hue_background_visibility(self):
        css=(ROOT/'site/assets/styles.css').read_text(encoding='utf-8')
        self.assertIn("rgba(246,249,253,.72),rgba(247,249,252,.80)",css)
        self.assertIn("rgba(246,249,253,.76),rgba(247,249,252,.84)",css)
        self.assertIn("url('./img/hue-bridge-night.webp')",css)

    def test_mobile_non_ai_qa_helper_launchers(self):
        js=(ROOT/'site/assets/app.js').read_text(encoding='utf-8')
        css=(ROOT/'site/assets/styles.css').read_text(encoding='utf-8')
        for name in ('index.html','hoi-dap.html'):
            html=(ROOT/'site'/name).read_text(encoding='utf-8')
            self.assertIn('id="navAssistant"',html)
            self.assertIn('id="assistantMobileFab"',html)
            self.assertIn('id="openAssistant"',html)
            self.assertIn('id="assistantWrap"',html)
            self.assertIn('Không dùng AI bên ngoài',html)
            self.assertIn('assets/app.js?v=20261025-bright-monthly',html)
            self.assertIn('assets/styles.css?v=20261025-bright-monthly',html)
        self.assertIn("launcher.hidden=state.menu.assistant!==true",js)
        self.assertIn("$('#navAssistant').onclick=toggleAssistant",js)
        self.assertIn("$('#assistantMobileFab').onclick=toggleAssistant",js)
        self.assertIn("if(state.menu.assistant!==true)return",js)
        self.assertIn("assistantResults($('#assistantInput').value)",js)
        self.assertIn(".assistant-mobile-fab:not([hidden])",css)
        self.assertIn("height:100dvh",css)

    def test_monthly_payment_tracker_and_detail_modal(self):
        js=(ROOT/'site/assets/app.js').read_text(encoding='utf-8')
        css=(ROOT/'site/assets/styles.css').read_text(encoding='utf-8')
        for page in ('index.html','hoi-dap.html'):
            html=(ROOT/'site'/page).read_text(encoding='utf-8')
            self.assertIn('id="financeNavRate"',html)
            self.assertIn('id="paymentModal"',html)
            self.assertIn('id="closePaymentDetail"',html)
            self.assertIn('assets/app.js?v=20261025-bright-monthly',html)
        self.assertIn("feeRate=state.demo?null:state.stats?.modules?.payment?.completionRate",js)
        self.assertIn("function openPaymentDetail(index)",js)
        self.assertIn("paymentTop3Cards(rec)",js)
        self.assertIn("class=\"payment-table\"",js)
        self.assertIn("TK NH (x/y)",js)
        self.assertIn("HS khai báo (%)",js)
        self.assertIn("Thu trong kỳ (%)",js)
        self.assertIn("payment-account-cell",js)
        self.assertIn("Hoàn thành 100%",js)
        self.assertIn("'Hoàn thành':'Đang triển khai'",js)
        self.assertIn("paymentPeriod(stats)",js)
        self.assertIn("statsRankingPair(v.unitRanking,'bản ghi')",js)
        self.assertIn(".payment-detail-dialog{",css)

    def test_extra_unit_metrics_require_explicit_review(self):
        gs=(ROOT/'apps-script/Code.gs').read_text(encoding='utf-8')
        sync=(ROOT/'scripts/sync_public.py').read_text(encoding='utf-8')
        self.assertIn("includes('BANK_XY_BY_LEVEL2')",gs)
        self.assertIn("includes('HS_DECLARED_RATE')",gs)
        self.assertIn("approvedExtraFields",gs)
        self.assertIn("mappedTotal!==all-unmapped",gs)
        self.assertIn("filing_ok=isinstance(extra,dict)",sync)
        self.assertIn("bank_ok=isinstance(extra,dict)",sync)
        self.assertIn("if bank_ok:",sync)
        self.assertIn("if filing_ok:",sync)

    def test_js_syntax(self):
        p=subprocess.run(['node','--check',str(ROOT/'site/assets/app.js')],capture_output=True,text=True)
        self.assertEqual(p.returncode,0,p.stderr)

if __name__=='__main__':unittest.main()
