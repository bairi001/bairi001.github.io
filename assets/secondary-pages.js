(() => {
  "use strict";
  const header=document.getElementById("siteHeader");
  const button=document.getElementById("hamburger");
  const nav=document.getElementById("mobileNav");
  if(header){window.addEventListener("scroll",()=>header.classList.toggle("scrolled",window.scrollY>10),{passive:true});}
  if(!button||!nav)return;
  const closeNav=()=>{
    button.classList.remove("active");
    nav.classList.remove("open");
    button.setAttribute("aria-label",button.dataset.closedLabel||"メニューを開く");
    button.setAttribute("aria-expanded","false");
    document.body.style.overflow="";
  };
  window.closeSecondaryNav=closeNav;
  button.setAttribute("aria-expanded","false");
  button.addEventListener("click",()=>{
    const willOpen=!nav.classList.contains("open");
    button.classList.toggle("active",willOpen);
    nav.classList.toggle("open",willOpen);
    button.setAttribute("aria-label",willOpen?(button.dataset.openLabel||"メニューを閉じる"):(button.dataset.closedLabel||"メニューを開く"));
    button.setAttribute("aria-expanded",String(willOpen));
    document.body.style.overflow=willOpen?"hidden":"";
  });
  nav.querySelectorAll("a").forEach(link=>link.addEventListener("click",closeNav));
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeNav();});
})();
