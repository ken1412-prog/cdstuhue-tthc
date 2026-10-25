/* CDSTUHUE public admin launcher.
 * A URL is not an authentication secret. Passwords are NEVER accepted/stored here:
 * authentication takes place inside an owner-only Google Apps Script Web App.
 * Each device stores only the admin Web App URL entered by the owner.
 */
(()=>{
 'use strict';
 const KEY='cdstuhue_admin_portal_url_v1';
 const VALID=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/;
 document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-cdstuhue-admin]').forEach(button=>{
   button.addEventListener('click',(event)=>{
    let url='';
    try{url=localStorage.getItem(KEY)||'';}catch(e){}
    if(!VALID.test(url)||event.shiftKey){
      const provided=window.prompt(
        'Để mở Quản trị, nhập một lần URL /exec của Web App quản trị riêng (Only myself).\n' +
        'Sau khi lưu, bạn đăng nhập Google và nhập mật khẩu ở trang quản trị. '+
        'Giữ Shift khi bấm nút để đổi URL.',
        VALID.test(url)?url:''
      );
      if(provided===null)return;
      url=provided.trim();
      if(!VALID.test(url)){
       window.alert('URL không hợp lệ. Phải là URL HTTPS của Apps Script dạng https://script.google.com/macros/s/.../exec');
       return;
      }
      try{localStorage.setItem(KEY,url);}catch(e){}
    }
    window.open(url,'_blank','noopener,noreferrer');
   });
  });
 });
})();