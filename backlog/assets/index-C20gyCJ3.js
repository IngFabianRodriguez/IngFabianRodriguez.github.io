(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function e(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(r){if(r.ep)return;r.ep=!0;const o=e(r);fetch(r.href,o)}})();var Mt=n=>{throw TypeError(n)},At=(n,t,e)=>t.has(n)||Mt("Cannot "+e),s=(n,t,e)=>(At(n,t,"read from private field"),e?e.call(n):t.get(n)),y=(n,t,e)=>t.has(n)?Mt("Cannot add the same private member more than once"):t instanceof WeakSet?t.add(n):t.set(n,e),f=(n,t,e,i)=>(At(n,t,"write to private field"),t.set(n,e),e),h=(n,t,e)=>(At(n,t,"access private method"),e);(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))e(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&e(o)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function e(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();function zt({id:n=crypto.randomUUID(),name:t,description:e="",createdAt:i=new Date().toISOString(),updatedAt:r=new Date().toISOString()}){return{id:n,name:t,description:e,createdAt:i,updatedAt:r}}function Vt(n){const t=[];return(!n.name||n.name.trim().length===0)&&t.push("El nombre del producto es requerido"),n.name&&n.name.length>100&&t.push("El nombre no puede exceder 100 caracteres"),{valid:t.length===0,errors:t}}function Yt({id:n=crypto.randomUUID(),productId:t,name:e,description:i="",createdAt:r=new Date().toISOString(),updatedAt:o=new Date().toISOString()}){return{id:n,productId:t,name:e,description:i,createdAt:r,updatedAt:o}}function Kt(n){const t=[];return n.productId||t.push("El producto es requerido"),(!n.name||n.name.trim().length===0)&&t.push("El nombre del proyecto es requerido"),n.name&&n.name.length>100&&t.push("El nombre no puede exceder 100 caracteres"),{valid:t.length===0,errors:t}}const yt={ACTIVE:"active",COMPLETED:"completed"};function St({id:n=crypto.randomUUID(),projectId:t,name:e,startDate:i,endDate:r,status:o=yt.ACTIVE}){return{id:n,projectId:t,name:e,startDate:i,endDate:r,status:o}}function Qt(n){const t=[];return n.projectId||t.push("El proyecto es requerido"),(!n.name||n.name.trim().length===0)&&t.push("El nombre del sprint es requerido"),n.name&&n.name.length>100&&t.push("El nombre no puede exceder 100 caracteres"),n.startDate||t.push("La fecha de inicio es requerida"),n.endDate||t.push("La fecha de fin es requerida"),n.startDate&&n.endDate&&new Date(n.startDate)>new Date(n.endDate)&&t.push("La fecha de fin debe ser posterior a la fecha de inicio"),Object.values(yt).includes(n.status)||t.push("Estado inválido"),{valid:t.length===0,errors:t}}const L={TODO:"todo",IN_PROGRESS:"in_progress",DONE:"done"},J={LOW:"low",MEDIUM:"medium",HIGH:"high",CRITICAL:"critical"};function Xt({title:n,description:t="",status:e=L.TODO,priority:i=J.MEDIUM,storyPoints:r=null,tags:o=[],createdAt:a=new Date().toISOString(),updatedAt:d=new Date().toISOString()}){return{id:crypto.randomUUID(),title:n,description:t,status:e,priority:i,storyPoints:r,tags:o,createdAt:a,updatedAt:d}}function Pt(n){const t=[];return(!n.title||n.title.trim().length===0)&&t.push("El título es requerido"),n.title&&n.title.length>200&&t.push("El título no puede exceder 200 caracteres"),Object.values(L).includes(n.status)||t.push("Estado inválido"),Object.values(J).includes(n.priority)||t.push("Prioridad inválida"),n.storyPoints!==null&&(typeof n.storyPoints!="number"||n.storyPoints<0||n.storyPoints>100)&&t.push("Story points debe ser un número entre 0 y 100"),{valid:t.length===0,errors:t}}const ct="scrum_products",ut="scrum_projects",Z="scrum_sprints",F="scrum_tasks",ht="scrum_filter",U="scrum_active";var A,q,I,w,H,m,pt,It,g,Ct,Y,E,j,qt;class Zt{constructor(){y(this,g),y(this,A,[]),y(this,q,[]),y(this,I,[]),y(this,w,[]),y(this,H,{search:"",priority:"",tag:""}),y(this,m,{productId:null,projectId:null,sprintId:null}),y(this,pt,new Set),y(this,It,!1),h(this,g,Ct).call(this)}subscribe(t){return s(this,pt).add(t),()=>s(this,pt).delete(t)}getActiveProductId(){return s(this,m).productId}getActiveProjectId(){return s(this,m).projectId}getActiveSprintId(){return s(this,m).sprintId}setActiveProduct(t){s(this,m).productId=t,s(this,m).projectId=null,s(this,m).sprintId=null,h(this,g,E).call(this,U,s(this,m)),h(this,g,j).call(this)}setActiveProject(t){var e;if(s(this,m).projectId=t,s(this,m).sprintId=null,t){const i=this.getSprintsByProject(t);s(this,m).sprintId=((e=i[0])==null?void 0:e.id)??null}h(this,g,E).call(this,U,s(this,m)),h(this,g,j).call(this)}setActiveSprint(t){s(this,m).sprintId=t,h(this,g,E).call(this,U,s(this,m)),h(this,g,j).call(this)}getProducts(){return[...s(this,A)]}getProduct(t){return s(this,A).find(e=>e.id===t)??null}addProduct(t){const e=zt(t),{valid:i,errors:r}=Vt(e);if(!i)throw new Error(r.join(", "));return s(this,A).push(e),h(this,g,E).call(this,ct,s(this,A)),h(this,g,j).call(this),e}updateProduct(t,e){const i=s(this,A).findIndex(r=>r.id===t);if(i===-1)throw new Error(`Producto ${t} no encontrado`);return s(this,A)[i]={...s(this,A)[i],...e,updatedAt:new Date().toISOString()},h(this,g,E).call(this,ct,s(this,A)),h(this,g,j).call(this),s(this,A)[i]}deleteProduct(t){var e;s(this,q).filter(i=>i.productId===t).map(i=>i.id).forEach(i=>this.deleteProject(i)),f(this,A,s(this,A).filter(i=>i.id!==t)),h(this,g,E).call(this,ct,s(this,A)),s(this,m).productId===t&&(s(this,m).productId=((e=s(this,A)[0])==null?void 0:e.id)??null,s(this,m).projectId=null,s(this,m).sprintId=null,h(this,g,E).call(this,U,s(this,m))),h(this,g,j).call(this)}getProjects(t=null){return t||(t=s(this,m).productId),s(this,q).filter(e=>e.productId===t)}getProject(t){return s(this,q).find(e=>e.id===t)??null}getProjectByProduct(t){return s(this,q).filter(e=>e.productId===t)}addProject(t){const e=Yt({...t,productId:t.productId??s(this,m).productId}),{valid:i,errors:r}=Kt(e);if(!i)throw new Error(r.join(", "));if(s(this,q).push(e),h(this,g,E).call(this,ut,s(this,q)),this.getSprintsByProject(e.id).length===0){const o=St({name:"Sprint 1",startDate:new Date().toISOString().split("T")[0],endDate:new Date(Date.now()+12096e5).toISOString().split("T")[0],status:yt.ACTIVE,projectId:e.id});s(this,I).push(o),h(this,g,E).call(this,Z,s(this,I))}return h(this,g,j).call(this),e}updateProject(t,e){const i=s(this,q).findIndex(r=>r.id===t);if(i===-1)throw new Error(`Proyecto ${t} no encontrado`);return s(this,q)[i]={...s(this,q)[i],...e,updatedAt:new Date().toISOString()},h(this,g,E).call(this,ut,s(this,q)),h(this,g,j).call(this),s(this,q)[i]}deleteProject(t){const e=s(this,I).filter(i=>i.projectId===t).map(i=>i.id);f(this,w,s(this,w).filter(i=>!e.includes(i.sprintId))),f(this,I,s(this,I).filter(i=>i.projectId!==t)),f(this,q,s(this,q).filter(i=>i.id!==t)),h(this,g,E).call(this,ut,s(this,q)),h(this,g,E).call(this,Z,s(this,I)),h(this,g,E).call(this,F,s(this,w)),s(this,m).projectId===t&&(s(this,m).projectId=null,s(this,m).sprintId=null,h(this,g,E).call(this,U,s(this,m))),h(this,g,j).call(this)}getSprints(t=null){return t||(t=s(this,m).projectId),t?s(this,I).filter(e=>e.projectId===t):[]}getSprintsByProject(t){return s(this,I).filter(e=>e.projectId===t)}getSprint(t){return s(this,I).find(e=>e.id===t)??null}addSprint(t){const e=St({...t,projectId:t.projectId??s(this,m).projectId}),{valid:i,errors:r}=Qt(e);if(!i)throw new Error(r.join(", "));return s(this,I).push(e),h(this,g,E).call(this,Z,s(this,I)),h(this,g,j).call(this),e}updateSprint(t,e){const i=s(this,I).findIndex(r=>r.id===t);if(i===-1)throw new Error(`Sprint ${t} no encontrado`);return s(this,I)[i]={...s(this,I)[i],...e},h(this,g,E).call(this,Z,s(this,I)),h(this,g,j).call(this),s(this,I)[i]}deleteSprint(t){var e;if(f(this,w,s(this,w).filter(i=>i.sprintId!==t)),f(this,I,s(this,I).filter(i=>i.id!==t)),h(this,g,E).call(this,Z,s(this,I)),h(this,g,E).call(this,F,s(this,w)),s(this,m).sprintId===t){const i=this.getSprintsByProject(s(this,m).projectId);s(this,m).sprintId=((e=i[0])==null?void 0:e.id)??null,h(this,g,E).call(this,U,s(this,m))}h(this,g,j).call(this)}getTasks(){let t=[...s(this,w)];if(s(this,m).sprintId)t=t.filter(e=>e.sprintId===s(this,m).sprintId);else if(s(this,m).projectId){const e=this.getSprintsByProject(s(this,m).projectId).map(i=>i.id);t=t.filter(i=>e.includes(i.sprintId))}else if(s(this,m).productId){const e=this.getProjectByProduct(s(this,m).productId).map(r=>r.id),i=s(this,I).filter(r=>e.includes(r.projectId)).map(r=>r.id);t=t.filter(r=>i.includes(r.sprintId))}return t}getTasksByStatus(t){return this.getTasks().filter(e=>e.status===t)}getTask(t){return s(this,w).find(e=>e.id===t)??null}addTask(t){var e;const i=t.sprintId??s(this,m).sprintId??((e=this.getSprints()[0])==null?void 0:e.id),r=Xt({...t,position:s(this,w).filter(d=>d.sprintId===(i??"")).length}),{valid:o,errors:a}=Pt(r);if(!o)throw new Error(a.join(", "));return s(this,w).push(r),h(this,g,E).call(this,F,s(this,w)),h(this,g,j).call(this),r}updateTask(t,e){const i=s(this,w).findIndex(a=>a.id===t);if(i===-1)throw new Error(`Tarea ${t} no encontrada`);s(this,w)[i]={...s(this,w)[i],...e,id:t,updatedAt:new Date().toISOString()};const{valid:r,errors:o}=Pt(s(this,w)[i]);if(!r)throw new Error(o.join(", "));return h(this,g,E).call(this,F,s(this,w)),h(this,g,j).call(this),s(this,w)[i]}deleteTask(t){f(this,w,s(this,w).filter(e=>e.id!==t)),h(this,g,E).call(this,F,s(this,w)),h(this,g,j).call(this)}moveTask(t,e){return this.updateTask(t,{status:e})}reorderTask(t,e,i){if(!this.getTask(t))return;this.getTasksByStatus(e).forEach((o,a)=>{const d=s(this,w).findIndex(l=>l.id===o.id);d!==-1&&(s(this,w)[d].position=a)});const r=s(this,w).findIndex(o=>o.id===t);r!==-1&&(s(this,w)[r].status=e,s(this,w)[r].position=i),h(this,g,E).call(this,F,s(this,w)),h(this,g,j).call(this)}getSelectedSprintId(){return s(this,m).sprintId}setSelectedSprint(t){this.setActiveSprint(t)}getStats(){const t=this.getTasks(),e=t.filter(o=>o.status===L.TODO),i=t.filter(o=>o.status===L.IN_PROGRESS),r=t.filter(o=>o.status===L.DONE);return{total:t.length,filteredTotal:t.length,todo:e.length,inProgress:i.length,done:r.length,totalPoints:t.reduce((o,a)=>o+(a.storyPoints||0),0),donePoints:r.reduce((o,a)=>o+(a.storyPoints||0),0),filteredPoints:t.reduce((o,a)=>o+(a.storyPoints||0),0),filteredDonePoints:r.reduce((o,a)=>o+(a.storyPoints||0),0)}}getSprintStats(t){const e=s(this,w).filter(r=>r.sprintId===t),i=e.filter(r=>r.status===L.DONE);return{total:e.length,done:i.length,totalPoints:e.reduce((r,o)=>r+(o.storyPoints||0),0),donePoints:i.reduce((r,o)=>r+(o.storyPoints||0),0)}}getFilterCriteria(){return{...s(this,H)}}setFilterCriteria(t){f(this,H,{...s(this,H),...t}),h(this,g,E).call(this,ht,s(this,H)),h(this,g,j).call(this)}clearFilters(){f(this,H,{search:"",priority:"",tag:""}),h(this,g,E).call(this,ht,s(this,H)),h(this,g,j).call(this)}getFilteredTasks(t){const{search:e,priority:i,tag:r}={...s(this,H),...t};let o=this.getTasks();if(e!=null&&e.trim()){const a=e.toLowerCase();o=o.filter(d=>d.title.toLowerCase().includes(a)||(d.description??"").toLowerCase().includes(a))}return i&&i!=="all"&&(o=o.filter(a=>a.priority===i)),r&&r!=="all"&&(o=o.filter(a=>{var d;return(d=a.tags)==null?void 0:d.includes(r)})),o}getAllTags(){const t=new Set;return this.getTasks().forEach(e=>{var i;return(i=e.tags)==null?void 0:i.forEach(r=>t.add(r))}),Array.from(t).sort()}getFilteredCount(){return this.getFilteredTasks(s(this,H)).length}addTaskQuick(t,e=L.TODO){return this.addTask({title:t,status:e})}reset(){f(this,w,[]),f(this,H,{search:"",priority:"",tag:""}),h(this,g,E).call(this,F,s(this,w)),h(this,g,E).call(this,ht,s(this,H)),h(this,g,j).call(this)}}A=new WeakMap,q=new WeakMap,I=new WeakMap,w=new WeakMap,H=new WeakMap,m=new WeakMap,pt=new WeakMap,It=new WeakMap,g=new WeakSet,Ct=function(){var n;if(f(this,A,h(this,g,Y).call(this,ct)),f(this,q,h(this,g,Y).call(this,ut)),f(this,I,h(this,g,Y).call(this,Z)),f(this,w,h(this,g,Y).call(this,F)),f(this,H,h(this,g,Y).call(this,ht)||{search:"",priority:"",tag:""}),f(this,m,h(this,g,Y).call(this,U)||{productId:null,projectId:null,sprintId:null}),f(this,It,!0),s(this,A).length===0){const t=zt({name:"Mi Producto"});s(this,A).push(t),h(this,g,E).call(this,ct,s(this,A)),s(this,m).productId=t.id}if(s(this,m).productId&&!this.getProduct(s(this,m).productId)&&(s(this,m).productId=((n=s(this,A)[0])==null?void 0:n.id)??null),s(this,m).projectId&&!this.getProject(s(this,m).projectId)&&(s(this,m).projectId=null),s(this,m).sprintId&&!this.getSprint(s(this,m).sprintId)&&(s(this,m).sprintId=null),s(this,m).projectId&&this.getSprintsByProject(s(this,m).projectId).length===0){const t=St({name:"Sprint 1",startDate:new Date().toISOString().split("T")[0],endDate:new Date(Date.now()+12096e5).toISOString().split("T")[0],status:yt.ACTIVE,projectId:s(this,m).projectId});s(this,I).push(t),s(this,m).sprintId=t.id,h(this,g,E).call(this,Z,s(this,I))}h(this,g,E).call(this,U,s(this,m))},Y=function(n){try{const t=localStorage.getItem(n);return t?JSON.parse(t):[]}catch{return[]}},E=function(n,t){try{localStorage.setItem(n,JSON.stringify(t))}catch(e){console.error("Save error",n,e)}},j=function(){h(this,g,qt).call(this)},qt=function(){s(this,pt).forEach(n=>n(s(this,w)))};const c=new Zt;var G,K,$t,Tt,it,Lt,Bt,Ot;class Jt{constructor(){y(this,it),y(this,G,null),y(this,K,[]),y(this,$t,3),y(this,Tt,3e3),h(this,it,Lt).call(this)}notify(t,e="info",i=s(this,Tt)){if(h(this,it,Lt).call(this),s(this,K).length>=s(this,$t)){const l=s(this,K).shift();l&&(l.element.classList.add("toast-exit"),setTimeout(()=>l.element.remove(),200))}const r=document.createElement("div");r.className=`toast toast-${e}`,r.style.cssText=`
      background: ${h(this,it,Bt).call(this,e)};
      color: #11111b;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: auto;
      animation: toast-enter 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 320px;
    `;const o=h(this,it,Ot).call(this,e);if(r.innerHTML=`<span>${o}</span><span>${this.escapeHtml(t)}</span>`,e==="delete"){const l=document.createElement("button");l.textContent="↩︎ Deshacer",l.style.cssText=`
        background: rgba(0,0,0,0.2);
        border: none;
        color: #11111b;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
      `,l.onclick=()=>{this.onUndo&&this.onUndo(),this.dismiss(r)},r.appendChild(l)}const a=document.createElement("button");a.innerHTML="✕",a.style.cssText=`
      background: none;
      border: none;
      color: #11111b;
      cursor: pointer;
      font-size: 14px;
      opacity: 0.7;
      padding: 0;
      margin-left: 4px;
    `,a.onclick=()=>this.dismiss(r),r.appendChild(a),s(this,G).appendChild(r);const d={element:r,message:t,type:e};return s(this,K).push(d),i>0&&setTimeout(()=>this.dismiss(r),i),r}dismiss(t){!t||!t.parentElement||(t.classList.add("toast-exit"),setTimeout(()=>{t.remove(),f(this,K,s(this,K).filter(e=>e.element!==t))},200))}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}success(t,e){return this.notify(t,"success",e)}error(t,e){return this.notify(t,"error",e)}info(t,e){return this.notify(t,"info",e)}warning(t,e){return this.notify(t,"warning",e)}delete(t,e){return this.onUndo=e,this.notify(t,"delete",5e3)}}G=new WeakMap,K=new WeakMap,$t=new WeakMap,Tt=new WeakMap,it=new WeakSet,Lt=function(){s(this,G)||(f(this,G,document.createElement("div")),s(this,G).id="notifications-container",s(this,G).style.cssText=`
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 10000;
      pointer-events: none;
    `,document.body.appendChild(s(this,G)))},Bt=function(n){const t={success:"#a6e3a1",error:"#f38ba8",info:"#89b4fa",warning:"#f9e2af"};return t[n]||t.info},Ot=function(n){const t={success:"✅",error:"❌",info:"ℹ️",warning:"⚠️",delete:"🗑️"};return t[n]||t.info};const S=new Jt;var bt;class te extends HTMLElement{constructor(){super(...arguments),y(this,bt,null)}connectedCallback(){f(this,bt,c.subscribe(()=>this.refresh())),this.refresh()}disconnectedCallback(){var t;(t=s(this,bt))==null||t.call(this)}refresh(){var t,e;const i=c.getStats(),r=c.getFilterCriteria(),o=r.search||r.priority||r.tag,a=i.total>0?Math.round(i.done/i.total*100):0,d=c.getProduct(c.getActiveProductId()),l=c.getProject(c.getActiveProjectId()),b=c.getSprint(c.getActiveSprintId());this.innerHTML=`
      <style>
        :host { display: block; }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 24px;
          background: #11111b;
          border-bottom: 1px solid #313244;
          gap: 16px;
        }
        .title-area { display: flex; flex-direction: column; gap: 2px; }
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #6c7086;
        }
        .breadcrumb-item { display: flex; align-items: center; gap: 4px; }
        .breadcrumb-item span { color: #a6adc8; }
        .breadcrumb-item.active span { color: #cdd6f4; font-weight: 600; }
        .breadcrumb-sep { color: #45475a; }
        .title-row { display: flex; align-items: center; gap: 10px; }
        .title-icon { font-size: 22px; }
        .title {
          font-size: 18px;
          font-weight: 700;
          color: #cdd6f4;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .filter-badge {
          font-size: 10px;
          color: #89b4fa;
          background: #89b4fa22;
          padding: 3px 7px;
          border-radius: 4px;
          font-weight: 600;
        }
        .stats {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .stat { display: flex; flex-direction: column; align-items: center; gap: 1px; }
        .stat-value { font-size: 17px; font-weight: 700; color: #cdd6f4; }
        .stat-value.done { color: #a6e3a1; }
        .stat-value.progress { color: #f9e2af; }
        .stat-label { font-size: 9px; text-transform: uppercase; color: #6c7086; letter-spacing: 0.5px; }
        .progress-bar {
          width: 100px; height: 5px; background: #313244; border-radius: 3px; overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #a6e3a1, #94e2d5);
          border-radius: 3px;
          transition: width 0.4s ease;
        }
        .header-actions { display: flex; gap: 8px; align-items: center; }
        .btn-add {
          background: #89b4fa; color: #11111b; border: none;
          padding: 9px 18px; border-radius: 8px; font-size: 13px;
          font-weight: 600; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 6px;
        }
        .btn-add:hover { background: #b4befe; transform: translateY(-1px); }
        .btn-export {
          background: #313244; color: #cdd6f4; border: none;
          padding: 9px 14px; border-radius: 8px; font-size: 12px;
          font-weight: 600; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 6px;
        }
        .btn-export:hover { background: #45475a; }
        @media (max-width: 768px) {
          .header { flex-wrap: wrap; padding: 12px 16px; }
          .stats { gap: 10px; }
          .stat-value { font-size: 15px; }
          .progress-bar { width: 70px; }
          .btn-export { display: none; }
        }
      </style>
      <div class="header">
        <div class="title-area">
          <div class="breadcrumb">
            <div class="breadcrumb-item ${d?"":"active"}">
              <span>📦 ${d?"":"Sin producto"}</span>
            </div>
            ${d?`
              <span class="breadcrumb-sep">›</span>
              <div class="breadcrumb-item ${d&&!l?"active":""}">
                <span>📁 ${l?"":"Sin proyecto"}</span>
              </div>
            `:""}
            ${l?`
              <span class="breadcrumb-sep">›</span>
              <div class="breadcrumb-item ${b?"":"active"}">
                <span>🎯 ${b?"":"Sin sprint"}</span>
              </div>
            `:""}
          </div>
          <div class="title-row">
            <span class="title-icon">🎯</span>
            <h1 class="title">
              ${d?this.escapeHtml(d.name):"Scrum Backlog"}
              ${l?` › ${this.escapeHtml(l.name)}`:""}
              ${o?'<span class="filter-badge">Filtrado</span>':""}
            </h1>
          </div>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="stat-value">${i.filteredTotal!==i.total?`${i.filteredTotal}/`:""}${i.todo}</span>
            <span class="stat-label">To Do</span>
          </div>
          <div class="stat">
            <span class="stat-value progress">${i.inProgress}</span>
            <span class="stat-label">En curso</span>
          </div>
          <div class="stat">
            <span class="stat-value done">${i.done}</span>
            <span class="stat-label">Hechas</span>
          </div>
          <div class="stat">
            <span class="stat-label">Progreso</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${a}%"></div>
            </div>
            <span class="stat-label">${a}%</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-export" id="exportBtn" title="Exportar a CSV">📥 CSV</button>
          <button class="btn-add" id="addTaskBtn">➕ Nueva tarea</button>
        </div>
      </div>
    `,(t=this.querySelector("#addTaskBtn"))==null||t.addEventListener("click",()=>{this.dispatchEvent(new CustomEvent("open-create-modal",{bubbles:!0,composed:!0}))}),(e=this.querySelector("#exportBtn"))==null||e.addEventListener("click",()=>this.exportToCSV())}exportToCSV(){const t=c.getFilteredTasks(c.getFilterCriteria());if(t.length===0){S.warning("No hay tareas para exportar");return}const e=["id","title","description","status","priority","storyPoints","tags","sprintId","createdAt","updatedAt"],i=l=>{if(l==null)return"";const b=String(l);return b.includes(",")||b.includes('"')||b.includes(`
`)?`"${b.replace(/"/g,'""')}"`:b},r=[e.join(","),...t.map(l=>[i(l.id),i(l.title),i(l.description),i(l.status),i(l.priority),i(l.storyPoints),i((l.tags||[]).join(";")),i(l.sprintId),i(l.createdAt),i(l.updatedAt)].join(","))],o=new Blob([r.join(`
`)],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(o),d=document.createElement("a");d.href=a,d.download=`scrum-backlog-${new Date().toISOString().split("T")[0]}.csv`,d.click(),URL.revokeObjectURL(a),S.success(`Exportadas ${t.length} tareas`)}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}bt=new WeakMap;customElements.define("app-header",te);const tt={TASK_MOVED:"task:moved",DRAG_START:"drag:start",DRAG_END:"drag:end"};var Q;class ee{constructor(){y(this,Q,new Map)}on(t,e){return s(this,Q).has(t)||s(this,Q).set(t,new Set),s(this,Q).get(t).add(e),()=>this.off(t,e)}off(t,e){var i;(i=s(this,Q).get(t))==null||i.delete(e)}emit(t,e){var i;(i=s(this,Q).get(t))==null||i.forEach(r=>r(e))}}Q=new WeakMap;const et=new ee;var gt,lt,at,Ht,nt,V,Rt,wt,Nt,jt;class ie extends HTMLElement{constructor(){super(),y(this,V),y(this,gt,null),y(this,lt,!1),y(this,at,!1),y(this,Ht,!1),y(this,nt,new Set),this.attachShadow({mode:"open"})}connectedCallback(){f(this,gt,c.subscribe(()=>this.refresh())),this.refresh()}disconnectedCallback(){var t;(t=s(this,gt))==null||t.call(this)}refresh(){this.render()}render(){var t;const e=c.getProducts(),i=c.getActiveProductId(),r=c.getActiveProjectId(),o=c.getActiveSprintId();this.shadowRoot.innerHTML=`
      <style>
        :host {
          display: flex;
          flex-direction: column;
          width: 260px;
          min-width: 260px;
          background: #11111b;
          border-right: 1px solid #313244;
          height: 100%;
          overflow-y: auto;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }
        .sidebar-header {
          padding: 14px 16px 10px;
          border-bottom: 1px solid #1e1e2e;
        }
        .sidebar-title {
          font-size: 10px;
          font-weight: 700;
          color: #6c7086;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 10px;
        }
        .product-selector {
          position: relative;
        }
        .product-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 8px;
          color: #cdd6f4;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .product-btn:hover { border-color: #89b4fa; background: #252536; }
        .product-icon { font-size: 16px; }
        .product-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .product-arrow { font-size: 10px; color: #6c7086; }
        .product-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 8px;
          z-index: 100;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          cursor: pointer;
          font-size: 13px;
          color: #cdd6f4;
          transition: background 0.1s;
        }
        .dropdown-item:hover { background: #313244; }
        .dropdown-item.active { background: #89b4fa22; color: #89b4fa; }
        .dropdown-item.new-item { color: #89b4fa; border-top: 1px solid #313244; margin-top: 4px; padding-top: 10px; }
        .dropdown-divider { height: 1px; background: #313244; margin: 4px 0; }
        .sidebar-body { flex: 1; overflow-y: auto; padding: 12px 12px; }

        /* Tree */
        .section-label {
          font-size: 9px;
          font-weight: 700;
          color: #6c7086;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          padding: 8px 4px 4px;
        }
        .add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          background: transparent;
          border: 1px dashed #313244;
          border-radius: 7px;
          color: #6c7086;
          font-size: 12px;
          cursor: pointer;
          width: 100%;
          margin-top: 6px;
          transition: all 0.15s;
        }
        .add-btn:hover { border-color: #89b4fa; color: #89b4fa; }

        /* Project items */
        .project-item { margin-bottom: 6px; }
        .project-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 8px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 13px;
          color: #cdd6f4;
          transition: background 0.1s;
        }
        .project-header:hover { background: #181825; }
        .project-header.active { background: #1e1e2e; border: 1px solid #89b4fa44; }
        .project-chevron {
          font-size: 9px;
          color: #6c7086;
          transition: transform 0.15s;
          width: 14px;
          text-align: center;
        }
        .project-chevron.open { transform: rotate(90deg); }
        .project-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
        .project-count { font-size: 10px; color: #6c7086; }
        .project-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.1s; }
        .project-header:hover .project-actions { opacity: 1; }
        .action-btn {
          padding: 2px 4px;
          background: none;
          border: none;
          color: #6c7086;
          cursor: pointer;
          font-size: 12px;
          border-radius: 4px;
        }
        .action-btn:hover { background: #313244; color: #cdd6f4; }
        .project-actions.delete:hover { color: #f38ba8; }

        /* Sprint items (indented) */
        .sprint-list { padding-left: 20px; margin: 2px 0; }
        .sprint-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          color: #a6adc8;
          transition: all 0.1s;
        }
        .sprint-item:hover { background: #181825; color: #cdd6f4; }
        .sprint-item.active { background: #89b4fa22; color: #89b4fa; font-weight: 600; }
        .sprint-dot { width: 5px; height: 5px; border-radius: 50%; background: #89b4fa; flex-shrink: 0; }
        .sprint-item.completed .sprint-dot { background: #a6e3a1; }
        .sprint-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sprint-pts { font-size: 10px; color: #6c7086; }
        .sprint-actions { display: none; gap: 1px; }
        .sprint-item:hover .sprint-actions { display: flex; }
        .sprint-item.completed .sprint-name { text-decoration: line-through; }

        /* All tasks row */
        .all-tasks-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 8px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 12px;
          color: #a6adc8;
          margin-top: 8px;
          transition: all 0.1s;
        }
        .all-tasks-row:hover { background: #181825; color: #cdd6f4; }
        .all-tasks-row.active { color: #89b4fa; font-weight: 600; }
        .all-tasks-row .sprint-dot { background: #6c7086; }

        /* Forms */
        .create-form {
          margin-top: 8px;
          padding: 10px;
          background: #181825;
          border-radius: 8px;
          border: 1px solid #313244;
        }
        .form-title {
          font-size: 11px;
          font-weight: 600;
          color: #cdd6f4;
          margin-bottom: 8px;
        }
        .form-group { margin-bottom: 7px; }
        .form-group label {
          display: block;
          font-size: 10px;
          color: #6c7086;
          margin-bottom: 3px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .form-group input, .form-group select {
          width: 100%;
          background: #11111b;
          border: 1px solid #313244;
          border-radius: 6px;
          padding: 7px 9px;
          font-size: 12px;
          color: #cdd6f4;
          box-sizing: border-box;
        }
        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: #89b4fa;
        }
        .form-actions { display: flex; gap: 6px; margin-top: 8px; }
        .btn { flex: 1; padding: 7px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.1s; }
        .btn-primary { background: #89b4fa; color: #11111b; }
        .btn-primary:hover { background: #b4befe; }
        .btn-secondary { background: #313244; color: #cdd6f4; }
        .btn-secondary:hover { background: #45475a; }
        .btn-danger { background: transparent; border: 1px solid #f38ba844; color: #f38ba8; }
        .btn-danger:hover { background: #f38ba822; }

        /* Confirm dialog */
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .confirm-box {
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 12px;
          padding: 20px;
          max-width: 280px;
          text-align: center;
        }
        .confirm-box h3 { margin: 0 0 8px; color: #cdd6f4; font-size: 15px; }
        .confirm-box p { margin: 0 0 16px; color: #a6adc8; font-size: 13px; }
        .confirm-box .form-actions { margin-top: 0; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #313244; border-radius: 2px; }
      </style>

      <div class="sidebar-header">
        <div class="sidebar-title">Producto</div>
        <div class="product-selector">
          <button class="product-btn" id="productBtn">
            <span class="product-icon">📦</span>
            <span class="product-name">${this.escapeHtml(((t=e.find(a=>a.id===i))==null?void 0:t.name)??"Seleccionar")}</span>
            <span class="product-arrow">▸</span>
          </button>
          <div class="product-dropdown" id="productDropdown" style="display:none">
            ${e.map(a=>`
              <div class="dropdown-item ${a.id===i?"active":""}" data-product-id="${a.id}">
                📦 ${this.escapeHtml(a.name)}
              </div>
            `).join("")}
            <div class="dropdown-divider"></div>
            <div class="dropdown-item new-item" id="newProductBtn">➕ Nuevo producto</div>
          </div>
        </div>
      </div>

      <div class="sidebar-body">
        ${h(this,V,Rt).call(this,i,r,o)}
      </div>
    `,this.setupEventListeners(e,i)}setupEventListeners(t,e){var i,r,o,a,d,l,b;const u=this.shadowRoot;(i=u.getElementById("productBtn"))==null||i.addEventListener("click",p=>{p.stopPropagation();const v=u.getElementById("productDropdown");v.style.display=v.style.display==="none"?"block":"none"}),document.addEventListener("click",()=>{const p=u.getElementById("productDropdown");p&&(p.style.display="none")}),u.querySelectorAll(".dropdown-item[data-product-id]").forEach(p=>{p.addEventListener("click",()=>{c.setActiveProduct(p.dataset.productId),u.getElementById("productDropdown").style.display="none"})}),(r=u.getElementById("newProductBtn"))==null||r.addEventListener("click",()=>{u.getElementById("productDropdown").style.display="none",f(this,lt,!0),this.refresh(),setTimeout(()=>{var p;return(p=u.getElementById("newProductName"))==null?void 0:p.focus()},10)}),(o=u.getElementById("cancelProduct"))==null||o.addEventListener("click",()=>{f(this,lt,!1),this.refresh()}),(a=u.getElementById("saveProduct"))==null||a.addEventListener("click",()=>{var p;const v=(p=u.getElementById("newProductName"))==null?void 0:p.value.trim();if(!v){S.error("El nombre es requerido");return}try{const k=c.addProduct({name:v});c.setActiveProduct(k.id),f(this,lt,!1),S.success(`Producto "${v}" creado`)}catch(k){S.error(k.message)}}),(d=u.getElementById("showProjectForm"))==null||d.addEventListener("click",()=>{f(this,at,!0),this.refresh(),setTimeout(()=>{var p;return(p=u.getElementById("newProjectName"))==null?void 0:p.focus()},10)}),(l=u.getElementById("cancelProject"))==null||l.addEventListener("click",()=>{f(this,at,!1),this.refresh()}),(b=u.getElementById("saveProject"))==null||b.addEventListener("click",()=>{var p;const v=(p=u.getElementById("newProjectName"))==null?void 0:p.value.trim();if(!v){S.error("El nombre es requerido");return}try{const k=c.addProject({name:v});c.setActiveProject(k.id),f(this,at,!1),S.success(`Proyecto "${v}" creado`)}catch(k){S.error(k.message)}}),u.querySelectorAll(".project-chevron").forEach(p=>{p.addEventListener("click",v=>{v.stopPropagation();const k=p.closest(".project-item").dataset.projectId;s(this,nt).has(k)?s(this,nt).delete(k):s(this,nt).add(k),this.refresh()})}),u.querySelectorAll(".project-header").forEach(p=>{p.addEventListener("click",v=>{var k;if(v.target.closest(".action-btn")||v.target.closest(".project-chevron"))return;const $=(k=p.closest(".project-item"))==null?void 0:k.dataset.projectId;$&&c.setActiveProject($)})}),u.querySelectorAll(".sprint-item").forEach(p=>{p.addEventListener("click",v=>{if(v.target.closest(".action-btn"))return;const k=p.dataset.sprintId;c.setActiveSprint(k)})}),u.querySelectorAll(".all-tasks-row").forEach(p=>{p.addEventListener("click",()=>{const v=p.dataset.projectId;c.setActiveProject(v),c.setActiveSprint(null)})}),u.querySelectorAll(".sprint-add").forEach(p=>{p.addEventListener("click",v=>{v.stopPropagation();const k=p.closest(".project-item"),$=k==null?void 0:k.dataset.projectId;if(!$)return;const M=k.querySelector(".sprint-list"),z=k.querySelector("#newSprintForm");if(z){z.remove();return}M&&M.insertAdjacentHTML("beforeend",h(this,V,Nt).call(this,$));const D=k.querySelector("#newSprintForm");D.querySelector("#cancelSprint").addEventListener("click",()=>D.remove()),D.querySelector("#saveSprint").addEventListener("click",()=>{var x,O,Dt;const kt=(x=D.querySelector("#newSprintName"))==null?void 0:x.value.trim(),_t=(O=D.querySelector("#newSprintStart"))==null?void 0:O.value,Ut=(Dt=D.querySelector("#newSprintEnd"))==null?void 0:Dt.value;if(!kt){S.error("El nombre es requerido");return}try{c.addSprint({name:kt,startDate:_t,endDate:Ut,projectId:$}),S.success(`Sprint "${kt}" creado`)}catch(Gt){S.error(Gt.message)}})})}),u.querySelectorAll(".sprint-del").forEach(p=>{p.addEventListener("click",v=>{v.stopPropagation();const k=p.closest(".sprint-item"),$=k==null?void 0:k.dataset.sprintId;if(!$)return;u.querySelectorAll(".confirm-overlay").forEach(x=>x.remove()),u.querySelector(".sidebar-body").insertAdjacentHTML("beforeend",h(this,V,jt).call(this,"Este sprint y sus tareas serán eliminados."));const M=u.getElementById("confirmYes"),z=u.getElementById("confirmNo"),D=u.getElementById("confirmOverlay");M==null||M.addEventListener("click",()=>{c.deleteSprint($),S.info("Sprint eliminado"),D.remove()}),z==null||z.addEventListener("click",()=>D.remove()),D==null||D.addEventListener("click",x=>{x.target===D&&D.remove()})})}),u.querySelectorAll(".project-del").forEach(p=>{p.addEventListener("click",v=>{v.stopPropagation();const k=p.closest(".project-item"),$=k==null?void 0:k.dataset.projectId;if(!$)return;const M=c.getProject($);u.querySelectorAll(".confirm-overlay").forEach(O=>O.remove()),u.querySelector(".sidebar-body").insertAdjacentHTML("beforeend",h(this,V,jt).call(this,`El proyecto "${M==null?void 0:M.name}" y todos sus sprints serán eliminados.`));const z=u.getElementById("confirmYes"),D=u.getElementById("confirmNo"),x=u.getElementById("confirmOverlay");z==null||z.addEventListener("click",()=>{c.deleteProject($),S.info("Proyecto eliminado"),x.remove()}),D==null||D.addEventListener("click",()=>x.remove()),x==null||x.addEventListener("click",O=>{O.target===x&&x.remove()})})})}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}gt=new WeakMap,lt=new WeakMap,at=new WeakMap,Ht=new WeakMap,nt=new WeakMap,V=new WeakSet,Rt=function(n,t,e){if(!n)return'<div style="color:#6c7086;font-size:12px;padding:12px">Selecciona un producto</div>';const i=c.getProjects(n);return i.length===0?`
        <div style="color:#6c7086;font-size:12px;padding:8px">No hay proyectos</div>
        ${h(this,V,wt).call(this)}
      `:`
      <div class="section-label">Proyectos</div>
      ${i.map(r=>{const o=c.getSprintsByProject(r.id),a=!s(this,nt).has(r.id);return`
          <div class="project-item" data-project-id="${r.id}">
            <div class="project-header ${r.id===t?"active":""}">
              <span class="project-chevron ${a?"open":""}">▸</span>
              <span class="project-name">${this.escapeHtml(r.name)}</span>
              <span class="project-count">${o.length}</span>
              <div class="project-actions">
                <button class="action-btn sprint-add" title="Nuevo sprint">➕</button>
                <button class="action-btn project-del delete" title="Eliminar proyecto">🗑️</button>
              </div>
            </div>
            ${a?`
              <div class="sprint-list">
                <div class="all-tasks-row ${!e&&r.id===t?"active":""}" data-scope="all" data-project-id="${r.id}">
                  <span class="sprint-dot"></span>
                  <span class="sprint-name">📋 Todas las tareas</span>
                </div>
                ${o.map(d=>{const l=c.getSprintStats(d.id);return`
                    <div class="sprint-item ${d.id===e?"active":""} ${d.status==="completed"?"completed":""}" data-sprint-id="${d.id}" data-project-id="${r.id}">
                      <span class="sprint-dot"></span>
                      <span class="sprint-name">${this.escapeHtml(d.name)}</span>
                      <span class="sprint-pts">${l.total}⭐</span>
                      <div class="sprint-actions">
                        <button class="action-btn sprint-del" title="Eliminar">🗑️</button>
                      </div>
                    </div>
                  `}).join("")}
              </div>
            `:""}
          </div>
        `}).join("")}
      ${s(this,at)?h(this,V,wt).call(this):`
        <button class="add-btn" id="showProjectForm">
          ➕ Nuevo proyecto
        </button>
      `}
    `},wt=function(){return`
      <div class="create-form" id="newProjectForm">
        <div class="form-title">Nuevo Proyecto</div>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="newProjectName" placeholder="Mi proyecto" />
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" id="cancelProject">Cancelar</button>
          <button class="btn btn-primary" id="saveProject">Crear</button>
        </div>
      </div>
    `},Nt=function(n){return`
      <div class="create-form" id="newSprintForm" data-project-id="${n}">
        <div class="form-title">Nuevo Sprint</div>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="newSprintName" placeholder="Sprint 1" />
        </div>
        <div class="form-group">
          <label>Fecha inicio</label>
          <input type="date" id="newSprintStart" />
        </div>
        <div class="form-group">
          <label>Fecha fin</label>
          <input type="date" id="newSprintEnd" />
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" id="cancelSprint">Cancelar</button>
          <button class="btn btn-primary" id="saveSprint">Crear</button>
        </div>
      </div>
    `},jt=function(n){return`
      <div class="confirm-overlay" id="confirmOverlay">
        <div class="confirm-box">
          <h3>¿Eliminar?</h3>
          <p>${n}</p>
          <div class="form-actions">
            <button class="btn btn-secondary" id="confirmNo">Cancelar</button>
            <button class="btn btn-danger" id="confirmYes">Eliminar</button>
          </div>
        </div>
      </div>
    `};customElements.define("sprint-sidebar",ie);var mt;class se extends HTMLElement{constructor(){super(),y(this,mt,null),this.attachShadow({mode:"open"})}connectedCallback(){f(this,mt,c.subscribe(()=>this.refresh())),this.refresh()}disconnectedCallback(){var t;(t=s(this,mt))==null||t.call(this)}refresh(){const t=c.getFilterCriteria(),e=c.getAllTags(),i=c.getStats(),r=t.search||t.priority||t.tag;this.render(t,e,i,r)}render(t,e,i,r){this.shadowRoot.innerHTML=`
      <style>
        :host {
          display: block;
          background: #11111b;
          border-bottom: 1px solid #313244;
          padding: 12px 24px;
        }
        .filter-bar {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .search-input {
          flex: 1;
          min-width: 180px;
          max-width: 280px;
          background: #181825;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #cdd6f4;
          transition: border-color 0.2s;
        }
        .search-input::placeholder {
          color: #6c7086;
        }
        .search-input:focus {
          outline: none;
          border-color: #89b4fa;
        }
        .filter-select {
          background: #181825;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #cdd6f4;
          cursor: pointer;
          min-width: 120px;
          transition: border-color 0.2s;
        }
        .filter-select:focus {
          outline: none;
          border-color: #89b4fa;
        }
        .clear-btn {
          display: ${r?"flex":"none"};
          align-items: center;
          gap: 4px;
          background: transparent;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #6c7086;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clear-btn:hover {
          border-color: #f38ba8;
          color: #f38ba8;
        }
        .results-count {
          margin-left: auto;
          font-size: 12px;
          color: #6c7086;
        }
        .results-count strong {
          color: #cdd6f4;
        }
      </style>
      
      <div class="filter-bar">
        <input 
          type="text" 
          class="search-input" 
          id="searchInput"
          placeholder="🔍 Buscar tareas..."
          value="${this.escapeAttr(t.search||"")}"
        />
        
        <select class="filter-select" id="priorityFilter">
          <option value="">Todas</option>
          <option value="low" ${t.priority==="low"?"selected":""}>🟢 Baja</option>
          <option value="medium" ${t.priority==="medium"?"selected":""}>🟡 Media</option>
          <option value="high" ${t.priority==="high"?"selected":""}>🟠 Alta</option>
          <option value="critical" ${t.priority==="critical"?"selected":""}>🔴 Crítica</option>
        </select>
        
        <select class="filter-select" id="tagFilter">
          <option value="">Todos</option>
          ${e.map(o=>`
            <option value="${this.escapeAttr(o)}" ${t.tag===o?"selected":""}>${this.escapeHtml(o)}</option>
          `).join("")}
        </select>
        
        <button class="clear-btn" id="clearBtn">
          ✕ Limpiar
        </button>
        
        <span class="results-count">
          ${i.filteredTotal!==i.total?`<strong>${i.filteredTotal}</strong> de ${i.total} tareas`:`<strong>${i.total}</strong> tareas`}
        </span>
      </div>
    `,this.setupEventListeners()}setupEventListeners(){const t=this.shadowRoot.getElementById("searchInput"),e=this.shadowRoot.getElementById("priorityFilter"),i=this.shadowRoot.getElementById("tagFilter"),r=this.shadowRoot.getElementById("clearBtn");let o;t==null||t.addEventListener("input",a=>{clearTimeout(o),o=setTimeout(()=>{c.setFilterCriteria({search:a.target.value})},150)}),e==null||e.addEventListener("change",a=>{c.setFilterCriteria({priority:a.target.value})}),i==null||i.addEventListener("change",a=>{c.setFilterCriteria({tag:a.target.value})}),r==null||r.addEventListener("click",()=>{c.clearFilters(),t.value="",e.value="",i.value=""})}focusSearch(){var t;(t=this.shadowRoot.getElementById("searchInput"))==null||t.focus()}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}escapeAttr(t){return t.replace(/"/g,"&quot;").replace(/'/g,"&#39;")}}mt=new WeakMap;customElements.define("filter-bar",se);const Et={[L.TODO]:{title:"📋 To Do",color:"#89b4fa"},[L.IN_PROGRESS]:{title:"⚡ In Progress",color:"#f9e2af"},[L.DONE]:{title:"✅ Done",color:"#a6e3a1"}};var P,W,ft,_,Ft,Wt;class re extends HTMLElement{constructor(){super(),y(this,P,null),y(this,W,[]),y(this,ft,null),y(this,_,!1),y(this,Ft,null),y(this,Wt,null),this.attachShadow({mode:"open"})}static get observedAttributes(){return["status"]}connectedCallback(){f(this,ft,c.subscribe(()=>this.refresh())),this.setupDropZone(),this.refresh()}disconnectedCallback(){var t;(t=s(this,ft))==null||t.call(this)}attributeChangedCallback(t,e,i){t==="status"&&e!==i&&(f(this,P,i),this.refresh())}set status(t){f(this,P,t),this.refresh()}refresh(){if(!s(this,P))return;const t=c.getFilterCriteria();let e=c.getFilteredTasks(t).filter(i=>i.status===s(this,P));e=e.sort((i,r)=>(i.position||0)-(r.position||0)),f(this,W,e),this.render(),this.setupDropZone()}setupDropZone(){const t=this.shadowRoot.querySelector(".column"),e=this.shadowRoot.querySelector(".task-list");!t||!e||(t.addEventListener("dragover",i=>{var r;i.preventDefault(),i.dataTransfer.dropEffect="move",t.classList.add("drag-over");const o=Array.from(e.querySelectorAll("task-card")),a=this.getDragAfterElement(o,i.clientY);e.querySelectorAll(".drop-indicator").forEach(l=>l.remove());const d=document.createElement("div");d.className="drop-indicator",d.style.cssText=`
        height: 3px;
        background: ${((r=Et[s(this,P)])==null?void 0:r.color)||"#89b4fa"};
        border-radius: 2px;
        margin: 4px 0;
      `,a?e.insertBefore(d,a):e.appendChild(d)}),t.addEventListener("dragleave",i=>{t.contains(i.relatedTarget)||(t.classList.remove("drag-over"),e.querySelectorAll(".drop-indicator").forEach(r=>r.remove()))}),t.addEventListener("drop",i=>{var r;i.preventDefault(),t.classList.remove("drag-over"),e.querySelectorAll(".drop-indicator").forEach(u=>u.remove());const o=i.dataTransfer.getData("text/plain");if(!o)return;const a=c.getTask(o);if(!a)return;const d=Array.from(e.querySelectorAll("task-card")),l=this.getDragAfterElement(d,i.clientY);let b=0;l?b=d.indexOf(l):b=d.length,a.status===s(this,P)?c.reorderTask(o,s(this,P),b):(c.moveTask(o,s(this,P)),b>0&&c.reorderTask(o,s(this,P),b)),S.success(`Tarea movida a ${((r=Et[s(this,P)])==null?void 0:r.title)||s(this,P)}`),et.emit(tt.TASK_MOVED,{taskId:o,newStatus:s(this,P)})}))}getDragAfterElement(t,e){return t.reduce((i,r)=>{const o=r.getBoundingClientRect(),a=e-o.top-o.height/2;return a<0&&a>i.offset?{offset:a,element:r}:i},{offset:Number.NEGATIVE_INFINITY}).element}render(){const t=Et[s(this,P)]||{title:"Unknown",color:"#6c7086"},e=s(this,W).reduce((r,o)=>r+(o.storyPoints||0),0),i=s(this,W).length===0;this.shadowRoot.innerHTML=`
      <style>
        :host {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 300px;
          max-width: 400px;
        }
        .column {
          background: #181825;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          height: fit-content;
          min-height: 200px;
          transition: all 0.2s ease;
        }
        .column.drag-over {
          background: #1e1e2e;
          border: 2px dashed ${t.color};
        }
        .column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          border-bottom: 2px solid ${t.color}33;
        }
        .column-title {
          font-size: 15px;
          font-weight: 600;
          color: #cdd6f4;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .task-count {
          background: ${t.color}22;
          color: ${t.color};
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .points-badge {
          font-size: 11px;
          color: #6c7086;
          background: #313244;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .column-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-add-task {
          background: none;
          border: none;
          color: #6c7086;
          font-size: 16px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .btn-add-task:hover {
          background: #313244;
          color: #cdd6f4;
        }
        .btn-select-all {
          background: none;
          border: none;
          color: #6c7086;
          font-size: 12px;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .btn-select-all:hover {
          background: #313244;
          color: #cdd6f4;
        }
        .task-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 100px;
        }
        .task-list.empty {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #45475a;
          font-size: 13px;
          border: 2px dashed #313244;
          border-radius: 8px;
          min-height: 100px;
        }
        .empty-content {
          text-align: center;
          padding: 20px;
        }
        .empty-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .empty-message {
          font-size: 13px;
          color: #6c7086;
        }
        .quick-add-form {
          display: flex;
          gap: 6px;
          padding: 8px;
          background: #1e1e2e;
          border-radius: 8px;
          border: 1px solid ${t.color}44;
        }
        .quick-add-input {
          flex: 1;
          background: #11111b;
          border: 1px solid #313244;
          border-radius: 6px;
          padding: 8px;
          font-size: 13px;
          color: #cdd6f4;
        }
        .quick-add-input:focus {
          outline: none;
          border-color: ${t.color};
        }
        .quick-add-input::placeholder {
          color: #6c7086;
        }
        .quick-add-btn {
          background: ${t.color};
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          color: #11111b;
        }
        .quick-add-btn:hover {
          opacity: 0.9;
        }
      </style>
      <div class="column">
        <div class="column-header">
          <span class="column-title">
            ${t.title}
            <span class="task-count">${s(this,W).length}</span>
          </span>
          <div class="column-actions">
            <span class="points-badge">${e} pts</span>
            <button class="btn-add-task" id="quickAddBtn" title="Agregar tarea">➕</button>
            <button class="btn-select-all" id="selectAllBtn" title="Seleccionar todos">☐</button>
          </div>
        </div>
        
        ${s(this,_)?`
          <div class="quick-add-form">
            <input type="text" class="quick-add-input" id="quickAddInput" placeholder="Nombre de la tarea..." />
            <button class="quick-add-btn" id="quickAddSubmit">+</button>
          </div>
        `:""}
        
        <div class="task-list ${i?"empty":""}">
          ${i&&!s(this,_)?`
            <div class="empty-content">
              <div class="empty-icon">📭</div>
              <div class="empty-message">Sin tareas</div>
              <div class="empty-message" style="margin-top:4px;font-size:11px">Arrastra aquí o presiona N</div>
            </div>
          `:i?`
            <div class="empty-content">
              <div class="empty-icon">📭</div>
              <div class="empty-message">Sin tareas</div>
            </div>
          `:s(this,W).map(r=>`<task-card task-id="${r.id}"></task-card>`).join("")}
        </div>
      </div>
    `,this.setupEventListeners(),this.setupDropZone()}setupEventListeners(){var t,e,i;(t=this.shadowRoot.getElementById("quickAddBtn"))==null||t.addEventListener("click",()=>{f(this,_,!0),this.render(),setTimeout(()=>{var o;(o=this.shadowRoot.getElementById("quickAddInput"))==null||o.focus()},10)});const r=this.shadowRoot.getElementById("quickAddInput");r==null||r.addEventListener("keydown",o=>{if(o.key==="Enter"){const a=o.target.value.trim();a&&(c.addTaskQuick(a,s(this,P)),S.success("Tarea creada")),f(this,_,!1),this.refresh()}else o.key==="Escape"&&(f(this,_,!1),this.refresh())}),(e=this.shadowRoot.getElementById("quickAddSubmit"))==null||e.addEventListener("click",()=>{const o=this.shadowRoot.getElementById("quickAddInput"),a=o==null?void 0:o.value.trim();a&&(c.addTaskQuick(a,s(this,P)),S.success("Tarea creada")),f(this,_,!1),this.refresh()}),(i=this.shadowRoot.getElementById("selectAllBtn"))==null||i.addEventListener("click",()=>{s(this,W).forEach(o=>{window.dispatchEvent(new CustomEvent("toggle-task-selection",{detail:{taskId:o.id}}))})})}}P=new WeakMap,W=new WeakMap,ft=new WeakMap,_=new WeakMap,Ft=new WeakMap,Wt=new WeakMap;customElements.define("task-column",re);const oe={[J.LOW]:"#22c55e",[J.MEDIUM]:"#f59e0b",[J.HIGH]:"#f97316",[J.CRITICAL]:"#ef4444"};var R,dt,st;class ae extends HTMLElement{constructor(){super(),y(this,R,null),y(this,dt,!1),y(this,st,!1),this.attachShadow({mode:"open"})}static get observedAttributes(){return["task-id"]}connectedCallback(){this.render(),this.setupDrag(),this.setupSelection()}attributeChangedCallback(t,e,i){t==="task-id"&&e!==i&&(f(this,R,c.getTask(i)),this.render())}set task(t){f(this,R,t),this.render(),this.setupDrag(),this.setupSelection()}get task(){return s(this,R)}set selected(t){f(this,dt,t);const e=this.shadowRoot.querySelector(".card");e&&e.classList.toggle("selected",t)}get selected(){return s(this,dt)}set checked(t){f(this,st,t);const e=this.shadowRoot.querySelector(".card-checkbox");if(e){e.checked=t;const i=this.shadowRoot.querySelector(".card");i==null||i.classList.toggle("checked",t)}}get checked(){return s(this,st)}setupSelection(){const t=this.shadowRoot.querySelector(".card"),e=this.shadowRoot.querySelector(".card-checkbox");t&&(t.addEventListener("click",i=>{i.target.closest(".card-checkbox")||i.target.closest(".actions")||window.dispatchEvent(new CustomEvent("open-task-detail",{detail:{taskId:s(this,R).id},bubbles:!0}))}),e==null||e.addEventListener("click",i=>{i.stopPropagation(),window.dispatchEvent(new CustomEvent("toggle-task-selection",{detail:{taskId:s(this,R).id},bubbles:!0}))}))}setupDrag(){const t=this.shadowRoot.querySelector(".card");t&&(t.setAttribute("draggable","true"),t.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/plain",s(this,R).id),e.dataTransfer.effectAllowed="move",t.classList.add("dragging"),et.emit(tt.DRAG_START,{taskId:s(this,R).id,status:s(this,R).status})}),t.addEventListener("dragend",()=>{t.classList.remove("dragging"),et.emit(tt.DRAG_END,{})}))}render(){if(!s(this,R))return;const{id:t,title:e,description:i,priority:r,storyPoints:o,tags:a}=s(this,R),d=a.length>0?`<div class="tags">${a.map(u=>`<span class="tag">${this.escapeHtml(u)}</span>`).join("")}</div>`:"",l=o!==null?`<span class="points">${o}</span>`:"",b=i.length>80?i.substring(0,80)+"...":i;this.shadowRoot.innerHTML=`
      <style>
        .card {
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 12px;
          cursor: grab;
          transition: all 0.2s ease;
          position: relative;
        }
        .card:hover {
          border-color: #585b70;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .card.dragging {
          opacity: 0.5;
          cursor: grabbing;
        }
        .card.selected {
          border-color: #89b4fa;
          box-shadow: 0 0 0 2px #89b4fa44;
        }
        .card.checked {
          background: #252535;
        }
        .card-checkbox-wrap {
          position: absolute;
          top: 8px;
          left: 8px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .card:hover .card-checkbox-wrap,
        .card.checked .card-checkbox-wrap {
          opacity: 1;
        }
        .card-checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #89b4fa;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          padding-left: 20px;
        }
        .priority-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 4px;
        }
        .title {
          font-size: 14px;
          font-weight: 500;
          color: #cdd6f4;
          margin: 0;
          flex: 1;
          margin-left: 8px;
          line-height: 1.4;
        }
        .description {
          font-size: 12px;
          color: #6c7086;
          margin: 0 0 8px 0;
          line-height: 1.5;
        }
        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }
        .tag {
          font-size: 10px;
          padding: 2px 6px;
          background: #313244;
          border-radius: 4px;
          color: #a6adc8;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .points {
          font-size: 11px;
          font-weight: 600;
          color: #fab387;
          background: rgba(250, 179, 135, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }
        .actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .card:hover .actions {
          opacity: 1;
        }
        .btn-action {
          background: none;
          border: none;
          color: #6c7086;
          cursor: pointer;
          font-size: 14px;
          padding: 2px 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .btn-action:hover {
          background: #313244;
          color: #cdd6f4;
        }
        .btn-action.delete:hover {
          color: #f38ba8;
        }
      </style>
      <div class="card ${s(this,dt)?"selected":""} ${s(this,st)?"checked":""}">
        <div class="card-checkbox-wrap">
          <input type="checkbox" class="card-checkbox" ${s(this,st)?"checked":""} />
        </div>
        <div class="card-header">
          <span class="priority-dot" style="background: ${oe[r]}"></span>
          <p class="title">${this.escapeHtml(e)}</p>
        </div>
        ${b?`<p class="description">${this.escapeHtml(b)}</p>`:""}
        ${d}
        <div class="card-footer">
          ${l}
          <div class="actions">
            <button class="btn-action edit" title="Editar" data-action="edit">✏️</button>
            <button class="btn-action delete" title="Eliminar" data-action="delete">🗑️</button>
          </div>
        </div>
      </div>
    `,this.setupSelection(),this.setupDrag(),this.shadowRoot.querySelectorAll(".btn-action").forEach(u=>{u.addEventListener("click",p=>{p.stopPropagation();const v=u.dataset.action;v==="edit"?this.dispatchEvent(new CustomEvent("task-edit",{detail:{id:t},bubbles:!0,composed:!0})):v==="delete"&&confirm("¿Eliminar esta tarea?")&&c.deleteTask(t)})})}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}R=new WeakMap,dt=new WeakMap,st=new WeakMap;customElements.define("task-card",ae);var rt,X;class ne extends HTMLElement{constructor(){super(...arguments),y(this,rt,null),y(this,X,!1)}connectedCallback(){this.addEventListener("task-edit",t=>{const e=c.getTask(t.detail.id);e&&(f(this,rt,e),f(this,X,!0),this.show())}),this.addEventListener("open-create-modal",()=>{f(this,rt,null),f(this,X,!1),this.show()}),this.addEventListener("keydown",t=>{t.key==="Escape"&&this.hide()})}show(){this.style.display="flex",this.render(),requestAnimationFrame(()=>{var t;(t=this.querySelector(".modal-backdrop"))==null||t.classList.add("active")})}hide(){const t=this.querySelector(".modal-backdrop");t?(t.classList.remove("active"),setTimeout(()=>{this.style.display="none",this.innerHTML=""},200)):this.style.display="none"}render(){const t=s(this,rt)||{title:"",description:"",status:L.TODO,priority:J.MEDIUM,storyPoints:null,tags:[]};this.innerHTML=`
      <style>
        :host {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 1000;
          justify-content: center;
          align-items: center;
        }
        .modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .modal-backdrop.active {
          opacity: 1;
        }
        .modal {
          position: relative;
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 16px;
          padding: 24px;
          width: 90%;
          max-width: 560px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          transform: translateY(20px);
          transition: transform 0.2s;
        }
        .modal-backdrop.active .modal {
          transform: translateY(0);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .modal-title {
          font-size: 18px;
          font-weight: 700;
          color: #cdd6f4;
          margin: 0;
        }
        .btn-close {
          background: none;
          border: none;
          color: #6c7086;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .btn-close:hover {
          background: #313244;
          color: #cdd6f4;
        }
        .form-group {
          margin-bottom: 16px;
        }
        label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #a6adc8;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        input, textarea, select {
          width: 100%;
          background: #11111b;
          border: 1px solid #313244;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          color: #cdd6f4;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #89b4fa;
        }
        textarea {
          resize: vertical;
          min-height: 80px;
        }
        select {
          cursor: pointer;
        }
        .row {
          display: flex;
          gap: 12px;
        }
        .row .form-group {
          flex: 1;
        }
        .priority-options {
          display: flex;
          gap: 8px;
        }
        .priority-option {
          flex: 1;
          padding: 8px;
          border: 1px solid #313244;
          border-radius: 6px;
          background: #11111b;
          color: #6c7086;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .priority-option:hover {
          border-color: #585b70;
        }
        .priority-option.selected {
          border-color: currentColor;
          background: currentColor;
        }
        .priority-option[data-priority="low"] { color: #22c55e; }
        .priority-option[data-priority="medium"] { color: #f59e0b; }
        .priority-option[data-priority="high"] { color: #f97316; }
        .priority-option[data-priority="critical"] { color: #ef4444; }
        .priority-option.selected span {
          color: #11111b;
          display: block;
        }
        .priority-option span {
          display: block;
        }
        .tags-input {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px;
          background: #11111b;
          border: 1px solid #313244;
          border-radius: 8px;
          min-height: 42px;
        }
        .tags-input:focus-within {
          border-color: #89b4fa;
        }
        .tag-item {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #313244;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #cdd6f4;
        }
        .tag-remove {
          background: none;
          border: none;
          color: #6c7086;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
          line-height: 1;
        }
        .tag-remove:hover {
          color: #f38ba8;
        }
        .tag-input-field {
          flex: 1;
          min-width: 80px;
          background: none;
          border: none;
          padding: 4px;
          font-size: 13px;
          color: #cdd6f4;
        }
        .tag-input-field:focus {
          outline: none;
        }
        .btn-submit {
          width: 100%;
          background: #89b4fa;
          color: #11111b;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
        }
        .btn-submit:hover {
          background: #b4befe;
        }
        .error-message {
          color: #f38ba8;
          font-size: 12px;
          margin-top: 4px;
        }
      </style>
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">${s(this,X)?"✏️ Editar tarea":"➕ Nueva tarea"}</h2>
            <button class="btn-close" id="closeBtn">✕</button>
          </div>
          <form id="taskForm">
            <div class="form-group">
              <label for="title">Título *</label>
              <input type="text" id="title" name="title" value="${this.escapeAttr(t.title)}" placeholder="¿Qué necesitas hacer?" maxlength="200" required />
            </div>
            <div class="form-group">
              <label for="description">Descripción</label>
              <textarea id="description" name="description" placeholder="Detalles adicionales, links, notas...">${this.escapeAttr(t.description)}</textarea>
            </div>
            <div class="row">
              <div class="form-group">
                <label for="status">Estado</label>
                <select id="status" name="status">
                  <option value="todo" ${t.status==="todo"?"selected":""}>📋 To Do</option>
                  <option value="in_progress" ${t.status==="in_progress"?"selected":""}>⚡ In Progress</option>
                  <option value="done" ${t.status==="done"?"selected":""}>✅ Done</option>
                </select>
              </div>
              <div class="form-group">
                <label for="storyPoints">Story Points</label>
                <input type="number" id="storyPoints" name="storyPoints" value="${t.storyPoints??""}" placeholder="0" min="0" max="100" />
              </div>
            </div>
            <div class="form-group" id="sprintFormGroup" style="display:${c.getActiveProjectId()?"block":"none"}">
              <label for="sprintSelect">Sprint</label>
              <select id="sprintSelect" name="sprint">
                <option value="">— Sin sprint —</option>
                ${c.getSprints(c.getActiveProjectId()).map(e=>`
                  <option value="${e.id}" ${(t.sprintId??c.getActiveSprintId())===e.id?"selected":""}>${this.escapeHtml(e.name)}</option>
                `).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Prioridad</label>
              <div class="priority-options">
                <button type="button" class="priority-option ${t.priority==="low"?"selected":""}" data-priority="low"><span>🟢 Baja</span></button>
                <button type="button" class="priority-option ${t.priority==="medium"?"selected":""}" data-priority="medium"><span>🟡 Media</span></button>
                <button type="button" class="priority-option ${t.priority==="high"?"selected":""}" data-priority="high"><span>🟠 Alta</span></button>
                <button type="button" class="priority-option ${t.priority==="critical"?"selected":""}" data-priority="critical"><span>🔴 Crítica</span></button>
              </div>
            </div>
            <div class="form-group">
              <label>Tags</label>
              <div class="tags-input" id="tagsInput">
                ${(t.tags||[]).map(e=>`
                  <span class="tag-item">
                    ${this.escapeHtml(e)}
                    <button type="button" class="tag-remove" data-tag="${this.escapeAttr(e)}">✕</button>
                  </span>
                `).join("")}
                <input type="text" class="tag-input-field" placeholder="Agregar tag..." id="tagInputField" />
              </div>
            </div>
            <button type="submit" class="btn-submit">
              ${s(this,X)?"💾 Guardar cambios":"🚀 Crear tarea"}
            </button>
          </form>
        </div>
      </div>
    `,this.setupEventListeners()}setupEventListeners(){var t,e,i;(t=this.querySelector("#closeBtn"))==null||t.addEventListener("click",()=>this.hide()),(e=this.querySelector(".modal-backdrop"))==null||e.addEventListener("click",o=>{o.target.classList.contains("modal-backdrop")&&this.hide()}),this.querySelectorAll(".priority-option").forEach(o=>{o.addEventListener("click",()=>{this.querySelectorAll(".priority-option").forEach(a=>a.classList.remove("selected")),o.classList.add("selected")})});const r=this.querySelector("#tagInputField");r==null||r.addEventListener("keydown",o=>{if(o.key==="Enter"||o.key===","){o.preventDefault();const a=r.value.trim().replace(",","");a&&(this.addTagToUI(a),r.value="")}}),this.querySelectorAll(".tag-remove").forEach(o=>{o.addEventListener("click",()=>{o.parentElement.remove()})}),(i=this.querySelector("#taskForm"))==null||i.addEventListener("submit",o=>{o.preventDefault(),this.handleSubmit()})}addTagToUI(t){var e;const i=this.querySelector("#tagsInput"),r=this.querySelector("#tagInputField");if(!i||Array.from(i.querySelectorAll(".tag-item")).map(a=>a.textContent.replace("✕","").trim()).includes(t))return;const o=document.createElement("span");o.className="tag-item",o.innerHTML=`${this.escapeHtml(t)}<button type="button" class="tag-remove" data-tag="${this.escapeAttr(t)}">✕</button>`,i.insertBefore(o,r),(e=o.querySelector(".tag-remove"))==null||e.addEventListener("click",()=>o.remove())}handleSubmit(){var t,e,i,r,o,a;const d=(t=this.querySelector("#title"))==null?void 0:t.value.trim(),l=((e=this.querySelector("#description"))==null?void 0:e.value.trim())||"",b=((i=this.querySelector("#status"))==null?void 0:i.value)||"todo",u=(r=this.querySelector("#storyPoints"))==null?void 0:r.value,p=((o=this.querySelector(".priority-option.selected"))==null?void 0:o.dataset.priority)||"medium",v=Array.from(this.querySelectorAll(".tag-item")).map(M=>M.textContent.replace("✕","").trim()),k=((a=this.querySelector("#sprintSelect"))==null?void 0:a.value)||null,$={title:d,description:l,status:b,priority:p,storyPoints:u?parseInt(u,10):null,tags:v,sprintId:k};try{s(this,X)?c.updateTask(s(this,rt).id,$):c.addTask($),this.hide()}catch(M){const z=this.querySelector(".error-message")||this.insertErrorEl();z&&(z.textContent=M.message)}}insertErrorEl(){var t;const e=document.createElement("div");return e.className="error-message",(t=this.querySelector("#taskForm"))==null||t.appendChild(e),e}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}escapeAttr(t){return t.replace(/"/g,"&quot;").replace(/'/g,"&#39;")}}rt=new WeakMap,X=new WeakMap;customElements.define("task-modal",ne);var C,N,vt;class le extends HTMLElement{constructor(){super(),y(this,C,null),y(this,N,!1),y(this,vt,null),this.attachShadow({mode:"open"})}connectedCallback(){f(this,vt,c.subscribe(()=>this.refresh())),document.addEventListener("keydown",this.handleKeydown.bind(this))}disconnectedCallback(){var t;(t=s(this,vt))==null||t.call(this),document.removeEventListener("keydown",this.handleKeydown.bind(this))}handleKeydown(t){t.key==="Escape"&&this.style.display!=="none"&&this.hide()}show(t){f(this,C,c.getTask(t)),s(this,C)&&(f(this,N,!1),this.style.display="flex",this.render(),requestAnimationFrame(()=>{var e;(e=this.querySelector(".detail-backdrop"))==null||e.classList.add("active")}))}hide(){const t=this.querySelector(".detail-backdrop");t?(t.classList.remove("active"),setTimeout(()=>{this.style.display="none",this.innerHTML=""},200)):this.style.display="none"}refresh(){if(s(this,C)){const t=c.getTask(s(this,C).id);t?(f(this,C,t),s(this,N)||this.render()):this.hide()}}render(){if(!s(this,C))return;const{id:t,title:e,description:i,status:r,priority:o,storyPoints:a,tags:d,sprintId:l,createdAt:b,updatedAt:u}=s(this,C),p=l?c.getSprint(l):null,v=p?p.name:"Backlog";this.innerHTML=`
      <style>
        :host {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 900;
          justify-content: flex-end;
        }
        .detail-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.5);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .detail-backdrop.active {
          opacity: 1;
        }
        .detail-panel {
          position: relative;
          width: 400px;
          max-width: 100%;
          height: 100%;
          background: #1e1e2e;
          border-left: 1px solid #313244;
          overflow-y: auto;
          transform: translateX(100%);
          transition: transform 0.2s;
          display: flex;
          flex-direction: column;
        }
        .detail-backdrop.active .detail-panel {
          transform: translateX(0);
        }
        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #313244;
          background: #181825;
        }
        .detail-title {
          font-size: 16px;
          font-weight: 700;
          color: #cdd6f4;
          margin: 0;
        }
        .btn-close {
          background: none;
          border: none;
          color: #6c7086;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .btn-close:hover {
          background: #313244;
          color: #cdd6f4;
        }
        .detail-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }
        .detail-section {
          margin-bottom: 20px;
        }
        .detail-label {
          font-size: 11px;
          font-weight: 600;
          color: #6c7086;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .detail-value {
          font-size: 14px;
          color: #cdd6f4;
          line-height: 1.5;
        }
        .detail-value.title-value {
          font-size: 18px;
          font-weight: 600;
        }
        .detail-meta {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .meta-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }
        .meta-badge.priority-low { background: #22c55e22; color: #22c55e; }
        .meta-badge.priority-medium { background: #f59e0b22; color: #f59e0b; }
        .meta-badge.priority-high { background: #f9731622; color: #f97316; }
        .meta-badge.priority-critical { background: #ef444422; color: #ef4444; }
        .meta-badge.status-todo { background: #89b4fa22; color: #89b4fa; }
        .meta-badge.status-in_progress { background: #f9e2af22; color: #f9e2af; }
        .meta-badge.status-done { background: #a6e3a122; color: #a6e3a1; }
        .meta-badge.points { background: #fab38722; color: #fab387; }
        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tag {
          font-size: 11px;
          padding: 3px 8px;
          background: #313244;
          border-radius: 4px;
          color: #a6adc8;
        }
        .detail-actions {
          display: flex;
          gap: 8px;
          padding: 16px 20px;
          border-top: 1px solid #313244;
          background: #181825;
        }
        .btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn-edit {
          background: #89b4fa;
          color: #11111b;
        }
        .btn-edit:hover {
          background: #b4befe;
        }
        .btn-delete {
          background: transparent;
          border: 1px solid #f38ba8;
          color: #f38ba8;
        }
        .btn-delete:hover {
          background: #f38ba822;
        }
        .btn-save {
          background: #a6e3a1;
          color: #11111b;
        }
        .btn-save:hover {
          background: #94e2d5;
        }
        .btn-cancel {
          background: #313244;
          color: #cdd6f4;
        }
        .btn-cancel:hover {
          background: #45475a;
        }
        .move-select {
          background: #181825;
          border: 1px solid #313244;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          color: #cdd6f4;
          cursor: pointer;
          flex: 1;
        }
        .move-select:focus {
          outline: none;
          border-color: #89b4fa;
        }
        /* Edit mode */
        .edit-form .form-group {
          margin-bottom: 16px;
        }
        .edit-form label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #6c7086;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .edit-form input,
        .edit-form textarea,
        .edit-form select {
          width: 100%;
          background: #11111b;
          border: 1px solid #313244;
          border-radius: 6px;
          padding: 10px;
          font-size: 14px;
          color: #cdd6f4;
          box-sizing: border-box;
        }
        .edit-form input:focus,
        .edit-form textarea:focus,
        .edit-form select:focus {
          outline: none;
          border-color: #89b4fa;
        }
        .edit-form textarea {
          resize: vertical;
          min-height: 80px;
        }
        .priority-options {
          display: flex;
          gap: 8px;
        }
        .priority-option {
          flex: 1;
          padding: 8px;
          border: 1px solid #313244;
          border-radius: 6px;
          background: #11111b;
          color: #6c7086;
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .priority-option:hover {
          border-color: #585b70;
        }
        .priority-option.selected {
          border-color: currentColor;
        }
        .priority-option[data-priority="low"] { color: #22c55e; }
        .priority-option[data-priority="medium"] { color: #f59e0b; }
        .priority-option[data-priority="high"] { color: #f97316; }
        .priority-option[data-priority="critical"] { color: #ef4444; }
        .priority-option.selected {
          background: currentColor;
        }
        .priority-option.selected span {
          color: #11111b;
        }
      </style>
      
      <div class="detail-backdrop">
        <div class="detail-panel">
          <div class="detail-header">
            <h2 class="detail-title">${s(this,N)?"✏️ Editar tarea":"📋 Detalle"}</h2>
            <button class="btn-close" id="closeBtn">✕</button>
          </div>
          
          ${s(this,N)?this.renderEditForm():this.renderViewMode(t,e,i,r,o,a,d,v,b,u,sprintLabels)}
          
          <div class="detail-actions">
            ${s(this,N)?`
              <button class="btn btn-cancel" id="cancelBtn">Cancelar</button>
              <button class="btn btn-save" id="saveBtn">💾 Guardar</button>
            `:`
              <select class="move-select" id="moveSelect">
                <option value="">Mover a...</option>
                <option value="todo" ${r==="todo"?"disabled":""}>📋 To Do</option>
                <option value="in_progress" ${r==="in_progress"?"disabled":""}>⚡ In Progress</option>
                <option value="done" ${r==="done"?"disabled":""}>✅ Done</option>
              </select>
              <button class="btn btn-edit" id="editBtn">✏️ Editar</button>
              <button class="btn btn-delete" id="deleteBtn">🗑️</button>
            `}
          </div>
        </div>
      </div>
    `,this.setupEventListeners()}renderViewMode(t,e,i,r,o,a,d,l,b,u){const p={low:"🟢 Baja",medium:"🟡 Media",high:"🟠 Alta",critical:"🔴 Crítica"},v={todo:"📋 To Do",in_progress:"⚡ In Progress",done:"✅ Done"};return`
      <div class="detail-body">
        <div class="detail-section">
          <div class="detail-value title-value">${this.escapeHtml(e)}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Descripción</div>
          <div class="detail-value">${i?this.escapeHtml(i):'<em style="color:#6c7086">Sin descripción</em>'}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Estado</div>
          <span class="meta-badge status-${r}">${v[r]}</span>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Prioridad</div>
          <span class="meta-badge priority-${o}">${p[o]}</span>
        </div>
        
        ${a!==null?`
          <div class="detail-section">
            <div class="detail-label">Story Points</div>
            <span class="meta-badge points">⭐ ${a}</span>
          </div>
        `:""}
        
        ${d&&d.length>0?`
          <div class="detail-section">
            <div class="detail-label">Tags</div>
            <div class="tag-list">
              ${d.map(k=>`<span class="tag">${this.escapeHtml(k)}</span>`).join("")}
            </div>
          </div>
        `:""}
        
        <div class="detail-section">
          <div class="detail-label">Sprint</div>
          <div class="detail-value">${this.escapeHtml(l)}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Fechas</div>
          <div class="detail-meta">
            <div class="meta-item">
              <span class="detail-label" style="margin-bottom:2px">Creado</span>
              <span class="detail-value">${new Date(b).toLocaleDateString("es-ES")}</span>
            </div>
            <div class="meta-item">
              <span class="detail-label" style="margin-bottom:2px">Actualizado</span>
              <span class="detail-value">${new Date(u).toLocaleDateString("es-ES")}</span>
            </div>
          </div>
        </div>
      </div>
    `}renderEditForm(){const t=s(this,C);return`
      <div class="detail-body edit-form">
        <div class="form-group">
          <label>Título</label>
          <input type="text" id="editTitle" value="${this.escapeAttr(t.title)}" />
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <textarea id="editDescription">${this.escapeAttr(t.description||"")}</textarea>
        </div>
        <div class="form-group">
          <label>Prioridad</label>
          <div class="priority-options" id="priorityOptions">
            <button type="button" class="priority-option ${t.priority==="low"?"selected":""}" data-priority="low"><span>🟢 Baja</span></button>
            <button type="button" class="priority-option ${t.priority==="medium"?"selected":""}" data-priority="medium"><span>🟡 Media</span></button>
            <button type="button" class="priority-option ${t.priority==="high"?"selected":""}" data-priority="high"><span>🟠 Alta</span></button>
            <button type="button" class="priority-option ${t.priority==="critical"?"selected":""}" data-priority="critical"><span>🔴 Crítica</span></button>
          </div>
        </div>
        <div class="form-group">
          <label>Story Points</label>
          <input type="number" id="editPoints" value="${t.storyPoints??""}" min="0" max="100" />
        </div>
      </div>
    `}setupEventListeners(){var t,e;(t=this.querySelector("#closeBtn"))==null||t.addEventListener("click",()=>this.hide()),(e=this.querySelector(".detail-backdrop"))==null||e.addEventListener("click",l=>{l.target.classList.contains("detail-backdrop")&&this.hide()});const i=this.querySelector("#editBtn");i==null||i.addEventListener("click",()=>{f(this,N,!0),this.render()});const r=this.querySelector("#deleteBtn");r==null||r.addEventListener("click",()=>{if(confirm("¿Eliminar esta tarea?")){const l=s(this,C).id,b=s(this,C).title,u={...s(this,C)};c.deleteTask(l),S.delete(`Tarea "${b}" eliminada`,()=>{try{c.addTask(u)}catch{S.error("No se pudo deshacer")}}),this.hide()}});const o=this.querySelector("#moveSelect");o==null||o.addEventListener("change",l=>{l.target.value&&(c.moveTask(s(this,C).id,l.target.value),S.success(`Tarea movida a ${l.target.options[l.target.selectedIndex].text}`),et.emit(tt.TASK_MOVED,{taskId:s(this,C).id,newStatus:l.target.value}))});const a=this.querySelector("#cancelBtn");a==null||a.addEventListener("click",()=>{f(this,N,!1),this.render()});const d=this.querySelector("#saveBtn");d==null||d.addEventListener("click",()=>{var l,b,u,p;const v=(l=this.querySelector("#editTitle"))==null?void 0:l.value.trim(),k=((b=this.querySelector("#editDescription"))==null?void 0:b.value.trim())||"",$=(u=this.querySelector("#editPoints"))==null?void 0:u.value,M=(p=this.querySelector(".priority-option.selected"))==null?void 0:p.dataset.priority;if(!v){S.error("El título es requerido");return}try{c.updateTask(s(this,C).id,{title:v,description:k,storyPoints:$?parseInt($,10):null,priority:M}),f(this,N,!1),S.success("Tarea actualizada"),this.render()}catch(z){S.error(z.message)}}),this.querySelectorAll(".priority-option").forEach(l=>{l.addEventListener("click",()=>{this.querySelectorAll(".priority-option").forEach(b=>b.classList.remove("selected")),l.classList.add("selected")})})}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}escapeAttr(t){return(t||"").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}}C=new WeakMap,N=new WeakMap,vt=new WeakMap;customElements.define("task-detail",le);var ot,xt;class de extends HTMLElement{constructor(){super(),y(this,ot,!0),y(this,xt,null),this.attachShadow({mode:"open"})}connectedCallback(){f(this,xt,c.subscribe(()=>this.refresh())),this.refresh()}disconnectedCallback(){var t;(t=s(this,xt))==null||t.call(this)}refresh(){const t=c.getSelectedSprintId();if(!t){this.renderEmpty();return}const e=c.getSprint(t);if(!e){this.renderEmpty();return}const i=c.getTasksBySprint(t),r=i.reduce((p,v)=>p+(v.storyPoints||0),0),o=new Date(e.startDate),a=new Date(e.endDate),d=new Date,l=this.getDaysBetween(o,a);Math.max(0,Math.min(l,this.getDaysBetween(o,d)));const b=[];for(let p=0;p<=l;p++){const v=r-r/l*p;b.push({day:p,points:Math.max(0,v)})}const u=this.calculateActualBurndown(i,o,l,r);this.render(e,r,l,b,u,s(this,ot))}getDaysBetween(t,e){return Math.ceil((e-t)/864e5)+1}calculateActualBurndown(t,e,i,r){const o=t.filter(b=>b.status===L.DONE),a=new Map;for(let b=0;b<=i;b++)a.set(b,0);o.forEach(b=>{const u=new Date(b.updatedAt),p=Math.max(0,Math.min(i,this.getDaysBetween(e,u))),v=a.get(p)||0;a.set(p,v+(b.storyPoints||0))});const d=[];let l=r;for(let b=0;b<=i;b++){const u=a.get(b)||0;l=l-u,d.push({day:b,points:Math.max(0,l)})}return d}renderEmpty(){this.shadowRoot.innerHTML=`
      <style>
        :host {
          display: block;
          background: #11111b;
          border-top: 1px solid #313244;
        }
        .chart-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          cursor: pointer;
          user-select: none;
        }
        .chart-toggle:hover {
          background: #181825;
        }
        .toggle-label {
          font-size: 13px;
          color: #6c7086;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .toggle-icon {
          font-size: 12px;
          transition: transform 0.2s;
        }
        .toggle-icon.expanded {
          transform: rotate(180deg);
        }
        .no-sprint-msg {
          padding: 12px 24px;
          font-size: 12px;
          color: #6c7086;
          text-align: center;
        }
      </style>
      <div class="chart-toggle" id="toggle">
        <span class="toggle-label">
          <span>📊</span>
          Burndown
        </span>
        <span class="toggle-icon ${s(this,ot)?"":"expanded"}">▼</span>
      </div>
    `,this.setupEventListeners()}render(t,e,i,r,o,a){const d={top:20,right:30,bottom:30,left:50},l=600-d.left-d.right,b=200-d.top-d.bottom,u=x=>d.left+x/i*l,p=x=>d.top+b-x/e*b,v=r.map((x,O)=>`${O===0?"M":"L"} ${u(x.day)} ${p(x.points)}`).join(" "),k=o.map((x,O)=>`${O===0?"M":"L"} ${u(x.day)} ${p(x.points)}`).join(" "),$=[],M=Math.ceil(e/5);for(let x=0;x<=e;x+=M)$.push(x);const z=[],D=Math.max(1,Math.floor(i/6));for(let x=0;x<=i;x+=D)z.push(x);this.shadowRoot.innerHTML=`
      <style>
        :host {
          display: block;
          background: #11111b;
          border-top: 1px solid #313244;
        }
        .chart-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          cursor: pointer;
          user-select: none;
        }
        .chart-toggle:hover {
          background: #181825;
        }
        .toggle-label {
          font-size: 13px;
          color: #6c7086;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .toggle-icon {
          font-size: 12px;
          transition: transform 0.2s;
        }
        .toggle-icon.expanded {
          transform: rotate(180deg);
        }
        .chart-container {
          padding: 0 24px 16px;
          display: ${a?"none":"block"};
        }
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .sprint-name {
          font-size: 14px;
          font-weight: 600;
          color: #cdd6f4;
        }
        .sprint-dates {
          font-size: 11px;
          color: #6c7086;
        }
        .chart-legend {
          display: flex;
          gap: 16px;
          font-size: 11px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .legend-line {
          width: 16px;
          height: 2px;
        }
        .legend-line.ideal {
          background: #6c7086;
        }
        .legend-line.actual {
          background: #89b4fa;
        }
        .chart-svg {
          display: block;
          width: 100%;
          max-width: 600px;
        }
        .axis-label {
          font-size: 10px;
          fill: #6c7086;
        }
        .grid-line {
          stroke: #313244;
          stroke-width: 1;
        }
        .ideal-line {
          fill: none;
          stroke: #6c7086;
          stroke-width: 1.5;
          stroke-dasharray: 4 2;
        }
        .actual-line {
          fill: none;
          stroke: #89b4fa;
          stroke-width: 2;
        }
        .data-point {
          fill: #89b4fa;
          r: 3;
        }
      </style>
      
      <div class="chart-toggle" id="toggle">
        <span class="toggle-label">
          <span>📊</span>
          Burndown - ${t.name}
        </span>
        <span class="toggle-icon ${a?"":"expanded"}">▼</span>
      </div>
      
      <div class="chart-container">
        <div class="chart-header">
          <span class="sprint-name">${t.name} - ${e} puntos totales</span>
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-line ideal"></span>
              <span>Ideal</span>
            </div>
            <div class="legend-item">
              <span class="legend-line actual"></span>
              <span>Real</span>
            </div>
          </div>
        </div>
        
        <svg class="chart-svg" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid meet">
          <!-- Grid lines -->
          ${$.map(x=>`
            <line class="grid-line" 
              x1="${d.left}" 
              y1="${p(x)}" 
              x2="${600-d.right}" 
              y2="${p(x)}" />
          `).join("")}
          
          <!-- Y-axis labels -->
          ${$.map(x=>`
            <text class="axis-label" x="${d.left-8}" y="${p(x)+3}" text-anchor="end">${x}</text>
          `).join("")}
          
          <!-- X-axis labels -->
          ${z.map(x=>`
            <text class="axis-label" x="${u(x)}" y="192" text-anchor="middle">Día ${x}</text>
          `).join("")}
          
          <!-- Ideal burndown line -->
          <path class="ideal-line" d="${v}" />
          
          <!-- Actual burndown line -->
          <path class="actual-line" d="${k}" />
          
          <!-- Data points for actual -->
          ${o.filter((x,O)=>O%Math.max(1,Math.floor(i/8))===0||O===o.length-1).map(x=>`
            <circle class="data-point" cx="${u(x.day)}" cy="${p(x.points)}" />
          `).join("")}
        </svg>
      </div>
    `,this.setupEventListeners()}setupEventListeners(){var t;(t=this.shadowRoot.getElementById("toggle"))==null||t.addEventListener("click",()=>{f(this,ot,!s(this,ot)),this.refresh()})}}ot=new WeakMap,xt=new WeakMap;customElements.define("burndown-chart",de);let T=null,B=new Set;function ce(){const n=document.getElementById("app");if(!n)return;n.innerHTML=`
    <app-header></app-header>
    <div class="main-container">
      <sprint-sidebar></sprint-sidebar>
      <div class="content-area">
        <filter-bar></filter-bar>
        <main class="board">
          <task-column status="${L.TODO}"></task-column>
          <task-column status="${L.IN_PROGRESS}"></task-column>
          <task-column status="${L.DONE}"></task-column>
        </main>
        <burndown-chart></burndown-chart>
      </div>
    </div>
    <task-modal></task-modal>
    <task-detail></task-detail>
    <bulk-action-bar></bulk-action-bar>
  `;const t=document.createElement("style");t.textContent=`
    .main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
      height: calc(100vh - 73px);
    }
    .content-area {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    .board {
      display: flex;
      gap: 16px;
      padding: 20px 24px;
      flex: 1;
      overflow-x: auto;
      align-items: flex-start;
    }
    .board::-webkit-scrollbar {
      height: 6px;
    }
    .board::-webkit-scrollbar-track {
      background: transparent;
    }
    .board::-webkit-scrollbar-thumb {
      background: var(--bg-card);
      border-radius: 3px;
    }
    @media (max-width: 768px) {
      .main-container {
        flex-direction: column;
      }
      sprint-sidebar {
        width: 100%;
        min-width: unset;
        height: auto;
        max-height: 200px;
        border-right: none;
        border-bottom: 1px solid #313244;
      }
      .board {
        min-width: 280px;
      }
    }
  `,n.appendChild(t);const e=n.querySelector("task-detail");class i extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.addEventListener("update-bulk-bar",()=>this.render())}render(){const d=B.size;this.shadowRoot.innerHTML=`
        <style>
          :host {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 800;
            display: ${d>0?"block":"none"};
          }
          .bulk-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #1e1e2e;
            border: 1px solid #313244;
            border-radius: 12px;
            padding: 12px 20px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          }
          .bulk-count {
            font-size: 14px;
            font-weight: 600;
            color: #cdd6f4;
            white-space: nowrap;
          }
          .bulk-select {
            background: #11111b;
            border: 1px solid #313244;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 13px;
            color: #cdd6f4;
            cursor: pointer;
          }
          .bulk-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .bulk-btn.move {
            background: #89b4fa;
            color: #11111b;
          }
          .bulk-btn.delete {
            background: transparent;
            border: 1px solid #f38ba8;
            color: #f38ba8;
          }
          .bulk-btn.clear {
            background: #313244;
            color: #cdd6f4;
          }
          .bulk-btn:hover {
            opacity: 0.9;
          }
        </style>
        <div class="bulk-bar">
          <span class="bulk-count">${d} seleccionada${d!==1?"s":""}</span>
          <select class="bulk-select" id="bulkMoveSelect">
            <option value="">Mover a...</option>
            <option value="todo">📋 To Do</option>
            <option value="in_progress">⚡ In Progress</option>
            <option value="done">✅ Done</option>
          </select>
          <button class="bulk-btn delete" id="bulkDeleteBtn">🗑️ Eliminar</button>
          <button class="bulk-btn clear" id="bulkClearBtn">Limpiar</button>
        </div>
      `,this.setupListeners()}setupListeners(){const d=this.shadowRoot.getElementById("bulkMoveSelect");d==null||d.addEventListener("change",u=>{u.target.value&&(B.forEach(p=>{c.moveTask(p,u.target.value)}),S.success(`${B.size} tareas movidas`),o())});const l=this.shadowRoot.getElementById("bulkDeleteBtn");l==null||l.addEventListener("click",()=>{if(confirm(`¿Eliminar ${B.size} tareas?`)){const u=B.size;B.forEach(p=>{c.deleteTask(p)}),S.info(`${u} tareas eliminadas`),o()}});const b=this.shadowRoot.getElementById("bulkClearBtn");b==null||b.addEventListener("click",()=>{o()})}}customElements.define("bulk-action-bar",i),window.addEventListener("open-task-detail",a=>{e==null||e.show(a.detail.taskId)}),window.addEventListener("toggle-task-selection",a=>{r(a.detail.taskId)}),document.addEventListener("keydown",a=>{var d,l,b,u;const p=a.target.matches("input, textarea, select");if(a.key==="Escape"){e==null||e.hide(),(d=document.querySelector("task-modal"))==null||d.hide(),o();return}if(!p){if(a.key==="n"||a.key==="N"){a.preventDefault(),(l=n.querySelector("task-modal"))==null||l.dispatchEvent(new CustomEvent("open-create-modal"));return}if(a.key==="f"||a.key==="F"||a.key==="/"){a.preventDefault(),(b=document.querySelector("filter-bar"))==null||b.focusSearch();return}if(a.key==="1"&&T){a.preventDefault(),c.moveTask(T,L.TODO),S.success("Tarea movida a To Do"),et.emit(tt.TASK_MOVED,{taskId:T,newStatus:L.TODO});return}if(a.key==="2"&&T){a.preventDefault(),c.moveTask(T,L.IN_PROGRESS),S.success("Tarea movida a In Progress"),et.emit(tt.TASK_MOVED,{taskId:T,newStatus:L.IN_PROGRESS});return}if(a.key==="3"&&T){a.preventDefault(),c.moveTask(T,L.DONE),S.success("Tarea movida a Done"),et.emit(tt.TASK_MOVED,{taskId:T,newStatus:L.DONE});return}if((a.key==="e"||a.key==="E")&&T){a.preventDefault(),(u=n.querySelector("task-modal"))==null||u.dispatchEvent(new CustomEvent("task-edit",{detail:{id:T},bubbles:!0}));return}if((a.key==="Delete"||a.key==="Backspace")&&T){a.preventDefault(),confirm("¿Eliminar esta tarea?")&&(c.deleteTask(T),S.info("Tarea eliminada"),T=null);return}}});function r(a){B.has(a)?B.delete(a):B.add(a),B.size===1?T=Array.from(B)[0]:B.size===0&&(T=null),document.querySelectorAll("task-card").forEach(d=>{const l=d.getAttribute("task-id");d.selected=l===T,d.checked=B.has(l)}),window.dispatchEvent(new CustomEvent("update-bulk-bar"))}function o(){B.clear(),T=null,document.querySelectorAll("task-card").forEach(a=>{a.selected=!1,a.checked=!1}),window.dispatchEvent(new CustomEvent("update-bulk-bar"))}c.subscribe(()=>{T&&!c.getTask(T)&&(T=null,B.clear(),window.dispatchEvent(new CustomEvent("update-bulk-bar")))})}document.addEventListener("DOMContentLoaded",()=>{ce()});
