window.SYA_CHANNEL_STATUS=Object.freeze({
  // WhatsApp Business is temporarily under review. Change only this value to true after access is restored.
  whatsapp:false
});

(function(){
  const whatsappEnabled=window.SYA_CHANNEL_STATUS.whatsapp===true;
  document.documentElement.classList.toggle('whatsapp-disabled',!whatsappEnabled);
  const apply=()=>{
    document.querySelectorAll('[data-whatsapp-enabled-copy]').forEach(el=>{el.hidden=!whatsappEnabled});
    document.querySelectorAll('[data-whatsapp-disabled-copy]').forEach(el=>{el.hidden=whatsappEnabled});
    document.querySelectorAll('[data-whatsapp-only]').forEach(el=>{el.hidden=!whatsappEnabled});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();
