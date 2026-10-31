import{r as j,g as rt,c as ut}from"./firebase-BgUAKcbp.js";import{fetchAndActivate as mt,getString as pt}from"https://www.gstatic.com/firebasejs/13.1.0/firebase-remote-config.js";import"https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";import"https://www.gstatic.com/firebasejs/13.1.0/firebase-analytics.js";async function ht(){if(j)try{await mt(j);const t=pt(j,"ip_config");if(!t||!t.trim()){console.warn("Chưa cấu hình IP cho ip_config"),alert("Bạn không có quyền truy cập trang quản trị kho từ khóa!"),window.location.replace("/");return}const e=await rt();(!e||!ut(e,t))&&(alert("Địa chỉ IP của bạn ("+(e||"Không xác định")+") không được phép truy cập kho từ khóa!"),window.location.replace("/"))}catch(t){console.warn("Lỗi kiểm tra bảo mật admin:",t)}}ht();const I="https://be-game-hoa-nao.onrender.com/api/words";let i=1,st=20,k="",$="",P="",S=[],N=!1,W=null,L=null;const B=document.getElementById("wordsTableBody"),gt=document.getElementById("paginationSummaryText"),h=document.getElementById("paginationNav"),x=document.getElementById("limitSelect"),tt=document.getElementById("statTotalWords"),et=document.getElementById("statCategoriesCount"),y=document.getElementById("wordSearchInput"),T=document.getElementById("clearSearchBtn"),r=document.getElementById("categoryFilterSelect"),M=document.getElementById("difficultyFilterSelect"),K=document.getElementById("openAddWordModalBtn"),R=document.getElementById("wordFormModal"),q=document.getElementById("closeFormModalBtn"),U=document.getElementById("cancelFormBtn"),H=document.getElementById("wordForm"),ct=document.getElementById("formModalTitle"),it=document.getElementById("formModalIcon"),dt=document.getElementById("editWordId"),u=document.getElementById("wordInput"),nt=document.getElementById("wordPreviewText"),ot=document.getElementById("wordLengthTag"),E=document.getElementById("formCategorySelect"),F=document.getElementById("toggleNewCategoryBtn"),C=document.getElementById("newCategoryBox"),J=document.getElementById("newCategoryInput"),D=document.getElementById("difficultyPills"),lt=document.getElementById("formDifficultyVal"),at=document.getElementById("saveWordBtn"),O=document.getElementById("saveBtnText"),Y=document.getElementById("deleteConfirmModal"),ft=document.getElementById("deleteWordTargetName"),z=document.getElementById("cancelDeleteBtn"),g=document.getElementById("confirmDeleteBtn"),yt=document.getElementById("toastContainer");document.addEventListener("DOMContentLoaded",()=>{G(),d(),xt()});async function G(){try{const t=await fetch(`${I}/categories`);t.ok&&(S=await t.json(),vt(S),et&&(et.textContent=`${S.length} chủ đề`))}catch(t){console.error("Lỗi tải danh mục:",t)}}function vt(t){if(r){const e=r.value;r.innerHTML='<option value="">Tất cả danh mục</option>',t.forEach(n=>{const a=document.createElement("option");a.value=n,a.textContent=n,r.appendChild(a)}),r.value=e}E&&(E.innerHTML='<option value="">-- Chọn danh mục có sẵn --</option>',t.forEach(e=>{const n=document.createElement("option");n.value=e,n.textContent=e,E.appendChild(n)}))}async function d(){Et();const t=new URLSearchParams({page:i,limit:st});k.trim()&&t.append("search",k.trim()),$&&t.append("category",$),P&&t.append("difficulty",P);try{const e=await fetch(`${I}?${t.toString()}`);if(!e.ok)throw new Error(`HTTP error ${e.status}`);const n=await e.json();bt(n),wt(n),tt&&!k&&!$&&!P&&(tt.textContent=`${n.total} từ`)}catch(e){console.error("Lỗi tải danh sách từ khóa:",e),Ct("Không thể kết nối đến máy chủ backend (Cổng 8080). Hãy đảm bảo Backend đang chạy.")}}function Et(){B.innerHTML=`
    <tr>
      <td colspan="6" class="table-loading-cell">
        <div class="loading-spinner"></div>
        <span>Đang nạp dữ liệu từ máy chủ...</span>
      </td>
    </tr>
  `}function Ct(t){B.innerHTML=`
    <tr>
      <td colspan="6" class="table-loading-cell" style="color: #ef4444;">
        <span style="font-size: 2rem; display: block; margin-bottom: 8px;">⚠️</span>
        <strong>${V(t)}</strong>
      </td>
    </tr>
  `}function bt(t){const e=t.items||[];if(e.length===0){B.innerHTML=`
      <tr>
        <td colspan="6" class="table-loading-cell" style="color: #94a3b8;">
          <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">🔍</span>
          <strong>Không tìm thấy từ khóa nào phù hợp với bộ lọc hiện tại.</strong>
          <p style="font-size: 0.82rem; margin-top: 4px;">Hãy thử tìm với từ khóa khác hoặc nhấn "Thêm Từ Khóa" để tạo mới.</p>
        </td>
      </tr>
    `;return}B.innerHTML="",e.forEach(n=>{var f,l;const a=document.createElement("tr"),o=n.createdAt?new Date(n.createdAt).toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"---",m=(n.difficulty||"NORMAL").toUpperCase();let b="normal",s="Bình thường";m==="EASY"?(b="easy",s="Dễ"):m==="HARD"&&(b="hard",s="Khó");const w=n.word?n.word.replace(/\s+/g,"").length:0;a.innerHTML=`
      <td><span class="table-id-tag">#${n.id}</span></td>
      <td>
        <div class="word-display-cell">
          <strong class="word-text-title">${V(n.word)}</strong>
          <span class="char-count-badge" title="Số ký tự chữ cái">${w} ký tự</span>
        </div>
      </td>
      <td>
        <span class="category-tag">
          <span>🏷️</span>
          <span>${V(n.category||"Tổng hợp")}</span>
        </span>
      </td>
      <td>
        <span class="difficulty-badge ${b}">
          <span>●</span>
          <span>${s}</span>
        </span>
      </td>
      <td><span class="date-text">${o}</span></td>
      <td>
        <div class="row-actions-cell">
          <button type="button" class="icon-action-btn edit-btn" title="Chỉnh sửa từ khóa" data-id="${n.id}">
            ✏️
          </button>
          <button type="button" class="icon-action-btn delete-btn" title="Xóa từ khóa" data-id="${n.id}">
            🗑️
          </button>
        </div>
      </td>
    `,(f=a.querySelector(".edit-btn"))==null||f.addEventListener("click",()=>kt(n)),(l=a.querySelector(".delete-btn"))==null||l.addEventListener("click",()=>Bt(n)),B.appendChild(a)})}function wt(t){const{page:e,limit:n,total:a,totalPages:o}=t,m=a===0?0:(e-1)*n+1,b=Math.min(e*n,a);if(gt.textContent=`Hiển thị ${m} – ${b} / Tổng số ${a} từ khóa`,h.innerHTML="",o<=1)return;const s=document.createElement("button");s.type="button",s.className="page-btn",s.innerHTML="‹",s.title="Trang trước",s.disabled=e<=1,s.addEventListener("click",()=>{i>1&&(i--,d())}),h.appendChild(s);let w=Math.max(1,e-2),f=Math.min(o,e+2);if(w>1){const p=X(1,e===1);if(h.appendChild(p),w>2){const c=document.createElement("span");c.style.color="#64748b",c.style.padding="0 4px",c.textContent="...",h.appendChild(c)}}for(let p=w;p<=f;p++){const c=X(p,p===e);h.appendChild(c)}if(f<o){if(f<o-1){const c=document.createElement("span");c.style.color="#64748b",c.style.padding="0 4px",c.textContent="...",h.appendChild(c)}const p=X(o,e===o);h.appendChild(p)}const l=document.createElement("button");l.type="button",l.className="page-btn",l.innerHTML="›",l.title="Trang sau",l.disabled=e>=o,l.addEventListener("click",()=>{i<o&&(i++,d())}),h.appendChild(l)}function X(t,e){const n=document.createElement("button");return n.type="button",n.className=`page-btn ${e?"active":""}`,n.textContent=t,e||n.addEventListener("click",()=>{i=t,d()}),n}function Tt(){N=!1,W=null,ct.textContent="Thêm Từ Khóa Mới",it.textContent="➕",O.textContent="Thêm từ khóa",H.reset(),dt.value="",C.style.display="none",Z("NORMAL"),Q(""),R.classList.add("active"),setTimeout(()=>u.focus(),50)}function kt(t){N=!0,W=t.id,ct.textContent=`Chỉnh Sửa Từ Khóa #${t.id}`,it.textContent="✏️",O.textContent="Cập nhật thay đổi",dt.value=t.id,u.value=t.word||"",Q(t.word||""),C.style.display="none",S.includes(t.category)?E.value=t.category:(E.value="",C.style.display="block",J.value=t.category||""),Z(t.difficulty||"NORMAL"),R.classList.add("active"),setTimeout(()=>u.focus(),50)}function A(){R.classList.remove("active")}function Q(t){const e=t.trim().toUpperCase();if(e){nt.textContent=e;const n=e.replace(/\s+/g,"").length;ot.textContent=`${n} ký tự chữ`}else nt.textContent="CHƯA NHẬP",ot.textContent="0 ký tự"}function Z(t){lt.value=t,D.querySelectorAll(".diff-pill").forEach(n=>{n.dataset.val===t?n.classList.add("active"):n.classList.remove("active")})}async function Lt(t){t.preventDefault();const e=u.value.trim().toUpperCase();if(!e){v("Vui lòng nhập từ khóa!","error"),u.focus();return}let n=E.value;C.style.display!=="none"&&(n=J.value.trim()),n||(n="Tổng hợp");const a=lt.value||"NORMAL";at.disabled=!0,O.textContent="Đang lưu...";try{if(N&&W){const o=await fetch(`${I}/${W}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({word:e,category:n,difficulty:a})}),m=await o.json();if(!o.ok)throw new Error(m.message||"Cập nhật thất bại");v(`Đã cập nhật từ khóa "${e}" thành công!`,"success")}else{const o=await fetch(I,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({word:e,category:n,difficulty:a})}),m=await o.json();if(!o.ok)throw new Error(m.message||"Thêm từ khóa thất bại");v(`Đã thêm từ khóa mới "${e}" vào Database!`,"success")}A(),G(),d()}catch(o){v(o.message,"error")}finally{at.disabled=!1,O.textContent=N?"Cập nhật thay đổi":"Thêm từ khóa"}}function Bt(t){L=t,ft.textContent=`"${t.word}" (#${t.id})`,Y.classList.add("active")}function _(){Y.classList.remove("active"),L=null}async function It(){if(L){g.disabled=!0,g.textContent="Đang xóa...";try{const t=await fetch(`${I}/${L.id}`,{method:"DELETE"}),e=await t.json();if(!t.ok)throw new Error(e.message||"Xóa từ khóa thất bại");v(`Đã xóa từ khóa "${L.word}" khỏi kho!`,"success"),_(),G(),d()}catch(t){v(t.message,"error")}finally{g.disabled=!1,g.textContent="Xóa Vĩnh Viễn"}}}function v(t,e="info"){const n=document.createElement("div");n.className=`toast ${e}`;const a=e==="success"?"✅":e==="error"?"❌":"ℹ️";n.innerHTML=`
    <span class="toast-icon">${a}</span>
    <span class="toast-message">${V(t)}</span>
  `,yt.appendChild(n),setTimeout(()=>{n.style.transition="opacity 0.3s ease, transform 0.3s ease",n.style.opacity="0",n.style.transform="translateY(10px)",setTimeout(()=>n.remove(),300)},3500)}function xt(){let t=null;y==null||y.addEventListener("input",()=>{const e=y.value;T.style.display=e?"block":"none",clearTimeout(t),t=setTimeout(()=>{k=e,i=1,d()},350)}),T==null||T.addEventListener("click",()=>{y.value="",T.style.display="none",k="",i=1,d(),y.focus()}),r==null||r.addEventListener("change",()=>{$=r.value,i=1,d()}),M==null||M.addEventListener("change",()=>{P=M.value,i=1,d()}),x==null||x.addEventListener("change",()=>{st=parseInt(x.value,10)||20,i=1,d()}),K==null||K.addEventListener("click",Tt),q==null||q.addEventListener("click",A),U==null||U.addEventListener("click",A),H==null||H.addEventListener("submit",Lt),u==null||u.addEventListener("input",()=>{Q(u.value)}),D==null||D.addEventListener("click",e=>{const n=e.target.closest(".diff-pill");n&&Z(n.dataset.val)}),F==null||F.addEventListener("click",()=>{const e=C.style.display!=="none";C.style.display=e?"none":"block",e||J.focus()}),z==null||z.addEventListener("click",_),g==null||g.addEventListener("click",It),window.addEventListener("click",e=>{e.target===R&&A(),e.target===Y&&_()})}function V(t){return t?t.replace(/[&<>'"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[e]||e):""}
