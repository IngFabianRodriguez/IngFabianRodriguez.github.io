var Ot=c=>{throw TypeError(c)};var $t=(c,r,t)=>r.has(c)||Ot("Cannot "+t);var s=(c,r,t)=>($t(c,r,"read from private field"),t?t.call(c):r.get(c)),y=(c,r,t)=>r.has(c)?Ot("Cannot add the same private member more than once"):r instanceof WeakSet?r.add(c):r.set(c,t),m=(c,r,t,i)=>($t(c,r,"write to private field"),i?i.call(c,t):r.set(c,t),t),h=(c,r,t)=>($t(c,r,"access private method"),t);(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))i(e);new MutationObserver(e=>{for(const n of e)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function t(e){const n={};return e.integrity&&(n.integrity=e.integrity),e.referrerPolicy&&(n.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?n.credentials="include":e.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(e){if(e.ep)return;e.ep=!0;const n=t(e);fetch(e.href,n)}})();function Ht({id:c=crypto.randomUUID(),name:r,description:t="",createdAt:i=new Date().toISOString(),updatedAt:e=new Date().toISOString()}){return{id:c,name:r,description:t,createdAt:i,updatedAt:e}}function Vt(c){const r=[];return(!c.name||c.name.trim().length===0)&&r.push("El nombre del producto es requerido"),c.name&&c.name.length>100&&r.push("El nombre no puede exceder 100 caracteres"),{valid:r.length===0,errors:r}}function Wt({id:c=crypto.randomUUID(),productId:r,name:t,description:i="",createdAt:e=new Date().toISOString(),updatedAt:n=new Date().toISOString()}){return{id:c,productId:r,name:t,description:i,createdAt:e,updatedAt:n}}function Qt(c){const r=[];return c.productId||r.push("El producto es requerido"),(!c.name||c.name.trim().length===0)&&r.push("El nombre del proyecto es requerido"),c.name&&c.name.length>100&&r.push("El nombre no puede exceder 100 caracteres"),{valid:r.length===0,errors:r}}const Et={ACTIVE:"active",COMPLETED:"completed"};function Lt({id:c=crypto.randomUUID(),projectId:r,name:t,startDate:i,endDate:e,status:n=Et.ACTIVE}){return{id:c,projectId:r,name:t,startDate:i,endDate:e,status:n}}function Xt(c){const r=[];return c.projectId||r.push("El proyecto es requerido"),(!c.name||c.name.trim().length===0)&&r.push("El nombre del sprint es requerido"),c.name&&c.name.length>100&&r.push("El nombre no puede exceder 100 caracteres"),c.startDate||r.push("La fecha de inicio es requerida"),c.endDate||r.push("La fecha de fin es requerida"),c.startDate&&c.endDate&&new Date(c.startDate)>new Date(c.endDate)&&r.push("La fecha de fin debe ser posterior a la fecha de inicio"),Object.values(Et).includes(c.status)||r.push("Estado inválido"),{valid:r.length===0,errors:r}}const j={TODO:"todo",IN_PROGRESS:"in_progress",DONE:"done"},st={LOW:"low",MEDIUM:"medium",HIGH:"high",CRITICAL:"critical"};function Zt({title:c,description:r="",status:t=j.TODO,priority:i=st.MEDIUM,storyPoints:e=null,tags:n=[],createdAt:o=new Date().toISOString(),updatedAt:a=new Date().toISOString()}){return{id:crypto.randomUUID(),title:c,description:r,status:t,priority:i,storyPoints:e,tags:n,createdAt:o,updatedAt:a}}function Rt(c){const r=[];return(!c.title||c.title.trim().length===0)&&r.push("El título es requerido"),c.title&&c.title.length>200&&r.push("El título no puede exceder 200 caracteres"),Object.values(j).includes(c.status)||r.push("Estado inválido"),Object.values(st).includes(c.priority)||r.push("Prioridad inválida"),c.storyPoints!==null&&(typeof c.storyPoints!="number"||c.storyPoints<0||c.storyPoints>100)&&r.push("Story points debe ser un número entre 0 y 100"),{valid:r.length===0,errors:r}}const ft="scrum_products",kt="scrum_projects",et="scrum_sprints",W="scrum_tasks",wt="scrum_filter",Q="scrum_active";var P,B,T,w,R,g,pt,St,f,Nt,it,S,A,Ft;class Jt{constructor(){y(this,f);y(this,P,[]);y(this,B,[]);y(this,T,[]);y(this,w,[]);y(this,R,{search:"",priority:"",tag:""});y(this,g,{productId:null,projectId:null,sprintId:null});y(this,pt,new Set);y(this,St,!1);h(this,f,Nt).call(this)}subscribe(r){return s(this,pt).add(r),()=>s(this,pt).delete(r)}getActiveProductId(){return s(this,g).productId}getActiveProjectId(){return s(this,g).projectId}getActiveSprintId(){return s(this,g).sprintId}setActiveProduct(r){s(this,g).productId=r,s(this,g).projectId=null,s(this,g).sprintId=null,h(this,f,S).call(this,Q,s(this,g)),h(this,f,A).call(this)}setActiveProject(r){var t;if(s(this,g).projectId=r,s(this,g).sprintId=null,r){const i=this.getSprintsByProject(r);s(this,g).sprintId=((t=i[0])==null?void 0:t.id)??null}h(this,f,S).call(this,Q,s(this,g)),h(this,f,A).call(this)}setActiveSprint(r){s(this,g).sprintId=r,h(this,f,S).call(this,Q,s(this,g)),h(this,f,A).call(this)}getProducts(){return[...s(this,P)]}getProduct(r){return s(this,P).find(t=>t.id===r)??null}addProduct(r){const t=Ht(r),{valid:i,errors:e}=Vt(t);if(!i)throw new Error(e.join(", "));return s(this,P).push(t),h(this,f,S).call(this,ft,s(this,P)),h(this,f,A).call(this),t}updateProduct(r,t){const i=s(this,P).findIndex(e=>e.id===r);if(i===-1)throw new Error(`Producto ${r} no encontrado`);return s(this,P)[i]={...s(this,P)[i],...t,updatedAt:new Date().toISOString()},h(this,f,S).call(this,ft,s(this,P)),h(this,f,A).call(this),s(this,P)[i]}deleteProduct(r){var i;s(this,B).filter(e=>e.productId===r).map(e=>e.id).forEach(e=>this.deleteProject(e)),m(this,P,s(this,P).filter(e=>e.id!==r)),h(this,f,S).call(this,ft,s(this,P)),s(this,g).productId===r&&(s(this,g).productId=((i=s(this,P)[0])==null?void 0:i.id)??null,s(this,g).projectId=null,s(this,g).sprintId=null,h(this,f,S).call(this,Q,s(this,g))),h(this,f,A).call(this)}getProjects(r=null){return r||(r=s(this,g).productId),s(this,B).filter(t=>t.productId===r)}getProject(r){return s(this,B).find(t=>t.id===r)??null}getProjectByProduct(r){return s(this,B).filter(t=>t.productId===r)}addProject(r){const t=Wt({...r,productId:r.productId??s(this,g).productId}),{valid:i,errors:e}=Qt(t);if(!i)throw new Error(e.join(", "));if(s(this,B).push(t),h(this,f,S).call(this,kt,s(this,B)),this.getSprintsByProject(t.id).length===0){const n=Lt({name:"Sprint 1",startDate:new Date().toISOString().split("T")[0],endDate:new Date(Date.now()+12096e5).toISOString().split("T")[0],status:Et.ACTIVE,projectId:t.id});s(this,T).push(n),h(this,f,S).call(this,et,s(this,T))}return h(this,f,A).call(this),t}updateProject(r,t){const i=s(this,B).findIndex(e=>e.id===r);if(i===-1)throw new Error(`Proyecto ${r} no encontrado`);return s(this,B)[i]={...s(this,B)[i],...t,updatedAt:new Date().toISOString()},h(this,f,S).call(this,kt,s(this,B)),h(this,f,A).call(this),s(this,B)[i]}deleteProject(r){const t=s(this,T).filter(i=>i.projectId===r).map(i=>i.id);m(this,w,s(this,w).filter(i=>!t.includes(i.sprintId))),m(this,T,s(this,T).filter(i=>i.projectId!==r)),m(this,B,s(this,B).filter(i=>i.id!==r)),h(this,f,S).call(this,kt,s(this,B)),h(this,f,S).call(this,et,s(this,T)),h(this,f,S).call(this,W,s(this,w)),s(this,g).projectId===r&&(s(this,g).projectId=null,s(this,g).sprintId=null,h(this,f,S).call(this,Q,s(this,g))),h(this,f,A).call(this)}getSprints(r=null){return r||(r=s(this,g).projectId),r?s(this,T).filter(t=>t.projectId===r):[]}getSprintsByProject(r){return s(this,T).filter(t=>t.projectId===r)}getSprint(r){return s(this,T).find(t=>t.id===r)??null}addSprint(r){const t=Lt({...r,projectId:r.projectId??s(this,g).projectId}),{valid:i,errors:e}=Xt(t);if(!i)throw new Error(e.join(", "));return s(this,T).push(t),h(this,f,S).call(this,et,s(this,T)),h(this,f,A).call(this),t}updateSprint(r,t){const i=s(this,T).findIndex(e=>e.id===r);if(i===-1)throw new Error(`Sprint ${r} no encontrado`);return s(this,T)[i]={...s(this,T)[i],...t},h(this,f,S).call(this,et,s(this,T)),h(this,f,A).call(this),s(this,T)[i]}deleteSprint(r){var t;if(m(this,w,s(this,w).filter(i=>i.sprintId!==r)),m(this,T,s(this,T).filter(i=>i.id!==r)),h(this,f,S).call(this,et,s(this,T)),h(this,f,S).call(this,W,s(this,w)),s(this,g).sprintId===r){const i=this.getSprintsByProject(s(this,g).projectId);s(this,g).sprintId=((t=i[0])==null?void 0:t.id)??null,h(this,f,S).call(this,Q,s(this,g))}h(this,f,A).call(this)}getTasks(){let r=[...s(this,w)];if(s(this,g).sprintId)r=r.filter(t=>t.sprintId===s(this,g).sprintId);else if(s(this,g).projectId){const t=this.getSprintsByProject(s(this,g).projectId).map(i=>i.id);r=r.filter(i=>t.includes(i.sprintId))}else if(s(this,g).productId){const t=this.getProjectByProduct(s(this,g).productId).map(e=>e.id),i=s(this,T).filter(e=>t.includes(e.projectId)).map(e=>e.id);r=r.filter(e=>i.includes(e.sprintId))}return r}getTasksByStatus(r){return this.getTasks().filter(t=>t.status===r)}getTask(r){return s(this,w).find(t=>t.id===r)??null}addTask(r){var o;const t=r.sprintId??s(this,g).sprintId??((o=this.getSprints()[0])==null?void 0:o.id),i=Zt({...r,position:s(this,w).filter(a=>a.sprintId===(t??"")).length}),{valid:e,errors:n}=Rt(i);if(!e)throw new Error(n.join(", "));return s(this,w).push(i),h(this,f,S).call(this,W,s(this,w)),h(this,f,A).call(this),i}updateTask(r,t){const i=s(this,w).findIndex(o=>o.id===r);if(i===-1)throw new Error(`Tarea ${r} no encontrada`);s(this,w)[i]={...s(this,w)[i],...t,id:r,updatedAt:new Date().toISOString()};const{valid:e,errors:n}=Rt(s(this,w)[i]);if(!e)throw new Error(n.join(", "));return h(this,f,S).call(this,W,s(this,w)),h(this,f,A).call(this),s(this,w)[i]}deleteTask(r){m(this,w,s(this,w).filter(t=>t.id!==r)),h(this,f,S).call(this,W,s(this,w)),h(this,f,A).call(this)}moveTask(r,t){return this.updateTask(r,{status:t})}reorderTask(r,t,i){if(!this.getTask(r))return;this.getTasksByStatus(t).forEach((a,b)=>{const d=s(this,w).findIndex(u=>u.id===a.id);d!==-1&&(s(this,w)[d].position=b)});const o=s(this,w).findIndex(a=>a.id===r);o!==-1&&(s(this,w)[o].status=t,s(this,w)[o].position=i),h(this,f,S).call(this,W,s(this,w)),h(this,f,A).call(this)}getSelectedSprintId(){return s(this,g).sprintId}setSelectedSprint(r){this.setActiveSprint(r)}getStats(){const r=this.getTasks(),t=r.filter(n=>n.status===j.TODO),i=r.filter(n=>n.status===j.IN_PROGRESS),e=r.filter(n=>n.status===j.DONE);return{total:r.length,filteredTotal:r.length,todo:t.length,inProgress:i.length,done:e.length,totalPoints:r.reduce((n,o)=>n+(o.storyPoints||0),0),donePoints:e.reduce((n,o)=>n+(o.storyPoints||0),0),filteredPoints:r.reduce((n,o)=>n+(o.storyPoints||0),0),filteredDonePoints:e.reduce((n,o)=>n+(o.storyPoints||0),0)}}getSprintStats(r){const t=s(this,w).filter(e=>e.sprintId===r),i=t.filter(e=>e.status===j.DONE);return{total:t.length,done:i.length,totalPoints:t.reduce((e,n)=>e+(n.storyPoints||0),0),donePoints:i.reduce((e,n)=>e+(n.storyPoints||0),0)}}getFilterCriteria(){return{...s(this,R)}}setFilterCriteria(r){m(this,R,{...s(this,R),...r}),h(this,f,S).call(this,wt,s(this,R)),h(this,f,A).call(this)}clearFilters(){m(this,R,{search:"",priority:"",tag:""}),h(this,f,S).call(this,wt,s(this,R)),h(this,f,A).call(this)}getFilteredTasks(r){const{search:t,priority:i,tag:e}={...s(this,R),...r};let n=this.getTasks();if(t!=null&&t.trim()){const o=t.toLowerCase();n=n.filter(a=>a.title.toLowerCase().includes(o)||(a.description??"").toLowerCase().includes(o))}return i&&i!=="all"&&(n=n.filter(o=>o.priority===i)),e&&e!=="all"&&(n=n.filter(o=>{var a;return(a=o.tags)==null?void 0:a.includes(e)})),n}getAllTags(){const r=new Set;return this.getTasks().forEach(t=>{var i;return(i=t.tags)==null?void 0:i.forEach(e=>r.add(e))}),Array.from(r).sort()}getFilteredCount(){return this.getFilteredTasks(s(this,R)).length}addTaskQuick(r,t=j.TODO){return this.addTask({title:r,status:t})}reset(){m(this,w,[]),m(this,R,{search:"",priority:"",tag:""}),h(this,f,S).call(this,W,s(this,w)),h(this,f,S).call(this,wt,s(this,R)),h(this,f,A).call(this)}}P=new WeakMap,B=new WeakMap,T=new WeakMap,w=new WeakMap,R=new WeakMap,g=new WeakMap,pt=new WeakMap,St=new WeakMap,f=new WeakSet,Nt=function(){var r;if(m(this,P,h(this,f,it).call(this,ft)),m(this,B,h(this,f,it).call(this,kt)),m(this,T,h(this,f,it).call(this,et)),m(this,w,h(this,f,it).call(this,W)),m(this,R,h(this,f,it).call(this,wt)||{search:"",priority:"",tag:""}),m(this,g,h(this,f,it).call(this,Q)||{productId:null,projectId:null,sprintId:null}),m(this,St,!0),s(this,P).length===0){const t=Ht({name:"Mi Producto"});s(this,P).push(t),h(this,f,S).call(this,ft,s(this,P)),s(this,g).productId=t.id}if(s(this,g).productId&&!this.getProduct(s(this,g).productId)&&(s(this,g).productId=((r=s(this,P)[0])==null?void 0:r.id)??null),s(this,g).projectId&&!this.getProject(s(this,g).projectId)&&(s(this,g).projectId=null),s(this,g).sprintId&&!this.getSprint(s(this,g).sprintId)&&(s(this,g).sprintId=null),s(this,g).projectId&&this.getSprintsByProject(s(this,g).projectId).length===0){const t=Lt({name:"Sprint 1",startDate:new Date().toISOString().split("T")[0],endDate:new Date(Date.now()+12096e5).toISOString().split("T")[0],status:Et.ACTIVE,projectId:s(this,g).projectId});s(this,T).push(t),s(this,g).sprintId=t.id,h(this,f,S).call(this,et,s(this,T))}h(this,f,S).call(this,Q,s(this,g))},it=function(r){try{const t=localStorage.getItem(r);return t?JSON.parse(t):[]}catch{return[]}},S=function(r,t){try{localStorage.setItem(r,JSON.stringify(t))}catch(i){console.error("Save error",r,i)}},A=function(){h(this,f,Ft).call(this)},Ft=function(){s(this,pt).forEach(r=>r(s(this,w)))};const l=new Jt;var Y,X,It,Tt,V,jt,_t,Ut;class te{constructor(){y(this,V);y(this,Y,null);y(this,X,[]);y(this,It,3);y(this,Tt,3e3);h(this,V,jt).call(this)}notify(r,t="info",i=s(this,Tt)){if(h(this,V,jt).call(this),s(this,X).length>=s(this,It)){const b=s(this,X).shift();b&&(b.element.classList.add("toast-exit"),setTimeout(()=>b.element.remove(),200))}const e=document.createElement("div");e.className=`toast toast-${t}`,e.style.cssText=`
      background: ${h(this,V,_t).call(this,t)};
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
    `;const n=h(this,V,Ut).call(this,t);if(e.innerHTML=`<span>${n}</span><span>${this.escapeHtml(r)}</span>`,t==="delete"){const b=document.createElement("button");b.textContent="↩︎ Deshacer",b.style.cssText=`
        background: rgba(0,0,0,0.2);
        border: none;
        color: #11111b;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
      `,b.onclick=()=>{this.onUndo&&this.onUndo(),this.dismiss(e)},e.appendChild(b)}const o=document.createElement("button");o.innerHTML="✕",o.style.cssText=`
      background: none;
      border: none;
      color: #11111b;
      cursor: pointer;
      font-size: 14px;
      opacity: 0.7;
      padding: 0;
      margin-left: 4px;
    `,o.onclick=()=>this.dismiss(e),e.appendChild(o),s(this,Y).appendChild(e);const a={element:e,message:r,type:t};return s(this,X).push(a),i>0&&setTimeout(()=>this.dismiss(e),i),e}dismiss(r){!r||!r.parentElement||(r.classList.add("toast-exit"),setTimeout(()=>{r.remove(),m(this,X,s(this,X).filter(t=>t.element!==r))},200))}escapeHtml(r){const t=document.createElement("div");return t.textContent=r,t.innerHTML}success(r,t){return this.notify(r,"success",t)}error(r,t){return this.notify(r,"error",t)}info(r,t){return this.notify(r,"info",t)}warning(r,t){return this.notify(r,"warning",t)}delete(r,t){return this.onUndo=t,this.notify(r,"delete",5e3)}}Y=new WeakMap,X=new WeakMap,It=new WeakMap,Tt=new WeakMap,V=new WeakSet,jt=function(){s(this,Y)||(m(this,Y,document.createElement("div")),s(this,Y).id="notifications-container",s(this,Y).style.cssText=`
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 10000;
      pointer-events: none;
    `,document.body.appendChild(s(this,Y)))},_t=function(r){const t={success:"#a6e3a1",error:"#f38ba8",info:"#89b4fa",warning:"#f9e2af"};return t[r]||t.info},Ut=function(r){const t={success:"✅",error:"❌",info:"ℹ️",warning:"⚠️",delete:"🗑️"};return t[r]||t.info};const I=new te;var bt;class ee extends HTMLElement{constructor(){super(...arguments);y(this,bt,null)}connectedCallback(){m(this,bt,l.subscribe(()=>this.refresh())),this.refresh()}disconnectedCallback(){var t;(t=s(this,bt))==null||t.call(this)}refresh(){var d,u;const t=l.getStats(),i=l.getFilterCriteria(),e=i.search||i.priority||i.tag,n=t.total>0?Math.round(t.done/t.total*100):0,o=l.getProduct(l.getActiveProductId()),a=l.getProject(l.getActiveProjectId()),b=l.getSprint(l.getActiveSprintId());this.innerHTML=`
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
            <div class="breadcrumb-item ${o?"":"active"}">
              <span>📦 ${o?"":"Sin producto"}</span>
            </div>
            ${o?`
              <span class="breadcrumb-sep">›</span>
              <div class="breadcrumb-item ${o&&!a?"active":""}">
                <span>📁 ${a?"":"Sin proyecto"}</span>
              </div>
            `:""}
            ${a?`
              <span class="breadcrumb-sep">›</span>
              <div class="breadcrumb-item ${b?"":"active"}">
                <span>🎯 ${b?"":"Sin sprint"}</span>
              </div>
            `:""}
          </div>
          <div class="title-row">
            <span class="title-icon">🎯</span>
            <h1 class="title">
              ${o?this.escapeHtml(o.name):"Scrum Backlog"}
              ${a?` › ${this.escapeHtml(a.name)}`:""}
              ${e?'<span class="filter-badge">Filtrado</span>':""}
            </h1>
          </div>
        </div>
        <div class="stats">
          <div class="stat">
            <span class="stat-value">${t.filteredTotal!==t.total?`${t.filteredTotal}/`:""}${t.todo}</span>
            <span class="stat-label">To Do</span>
          </div>
          <div class="stat">
            <span class="stat-value progress">${t.inProgress}</span>
            <span class="stat-label">En curso</span>
          </div>
          <div class="stat">
            <span class="stat-value done">${t.done}</span>
            <span class="stat-label">Hechas</span>
          </div>
          <div class="stat">
            <span class="stat-label">Progreso</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${n}%"></div>
            </div>
            <span class="stat-label">${n}%</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-export" id="exportBtn" title="Exportar a CSV">📥 CSV</button>
          <button class="btn-add" id="addTaskBtn">➕ Nueva tarea</button>
        </div>
      </div>
    `,(d=this.querySelector("#addTaskBtn"))==null||d.addEventListener("click",()=>{this.dispatchEvent(new CustomEvent("open-create-modal",{bubbles:!0,composed:!0}))}),(u=this.querySelector("#exportBtn"))==null||u.addEventListener("click",()=>this.exportToCSV())}exportToCSV(){const t=l.getFilteredTasks(l.getFilterCriteria());if(t.length===0){I.warning("No hay tareas para exportar");return}const i=["id","title","description","status","priority","storyPoints","tags","sprintId","createdAt","updatedAt"],e=d=>{if(d==null)return"";const u=String(d);return u.includes(",")||u.includes('"')||u.includes(`
`)?`"${u.replace(/"/g,'""')}"`:u},n=[i.join(","),...t.map(d=>[e(d.id),e(d.title),e(d.description),e(d.status),e(d.priority),e(d.storyPoints),e((d.tags||[]).join(";")),e(d.sprintId),e(d.createdAt),e(d.updatedAt)].join(","))],o=new Blob([n.join(`
`)],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(o),b=document.createElement("a");b.href=a,b.download=`scrum-backlog-${new Date().toISOString().split("T")[0]}.csv`,b.click(),URL.revokeObjectURL(a),I.success(`Exportadas ${t.length} tareas`)}escapeHtml(t){const i=document.createElement("div");return i.textContent=t,i.innerHTML}}bt=new WeakMap;customElements.define("app-header",ee);const ct={TASK_MOVED:"task:moved",DRAG_START:"drag:start",DRAG_END:"drag:end"};var Z;class ie{constructor(){y(this,Z,new Map)}on(r,t){return s(this,Z).has(r)||s(this,Z).set(r,new Set),s(this,Z).get(r).add(t),()=>this.off(r,t)}off(r,t){var i;(i=s(this,Z).get(r))==null||i.delete(t)}emit(r,t){var i;(i=s(this,Z).get(r))==null||i.forEach(e=>e(t))}}Z=new WeakMap;const lt=new ie;var gt,ut,rt,qt,ot,F,Yt,Dt,Gt,re,At;class se extends HTMLElement{constructor(){super();y(this,F);y(this,gt,null);y(this,ut,!1);y(this,rt,!1);y(this,qt,!1);y(this,ot,new Set);this.attachShadow({mode:"open"})}connectedCallback(){m(this,gt,l.subscribe(()=>this.refresh())),this.refresh()}disconnectedCallback(){var t;(t=s(this,gt))==null||t.call(this)}refresh(){this.render()}render(){var o;const t=l.getProducts(),i=l.getActiveProductId(),e=l.getActiveProjectId(),n=l.getActiveSprintId();this.shadowRoot.innerHTML=`
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
            <span class="product-name">${this.escapeHtml(((o=t.find(a=>a.id===i))==null?void 0:o.name)??"Seleccionar")}</span>
            <span class="product-arrow">▸</span>
          </button>
          <div class="product-dropdown" id="productDropdown" style="display:none">
            ${t.map(a=>`
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
        ${h(this,F,Yt).call(this,i,e,n)}
      </div>
    `,this.setupEventListeners(t,i)}setupEventListeners(t,i){var n,o,a,b,d,u,k;const e=this.shadowRoot;(n=e.getElementById("productBtn"))==null||n.addEventListener("click",p=>{p.stopPropagation();const x=e.getElementById("productDropdown");x.style.display=x.style.display==="none"?"block":"none"}),document.addEventListener("click",()=>{const p=e.getElementById("productDropdown");p&&(p.style.display="none")}),e.querySelectorAll(".dropdown-item[data-product-id]").forEach(p=>{p.addEventListener("click",()=>{l.setActiveProduct(p.dataset.productId),e.getElementById("productDropdown").style.display="none"})}),(o=e.getElementById("newProductBtn"))==null||o.addEventListener("click",()=>{e.getElementById("productDropdown").style.display="none",m(this,ut,!0),this.refresh(),setTimeout(()=>{var p;return(p=e.getElementById("newProductName"))==null?void 0:p.focus()},10)}),(a=e.getElementById("cancelProduct"))==null||a.addEventListener("click",()=>{m(this,ut,!1),this.refresh()}),(b=e.getElementById("saveProduct"))==null||b.addEventListener("click",()=>{var x;const p=(x=e.getElementById("newProductName"))==null?void 0:x.value.trim();if(!p){I.error("El nombre es requerido");return}try{const v=l.addProduct({name:p});l.setActiveProduct(v.id),m(this,ut,!1),I.success(`Producto "${p}" creado`)}catch(v){I.error(v.message)}}),(d=e.getElementById("showProjectForm"))==null||d.addEventListener("click",()=>{m(this,rt,!0),this.refresh(),setTimeout(()=>{var p;return(p=e.getElementById("newProjectName"))==null?void 0:p.focus()},10)}),(u=e.getElementById("cancelProject"))==null||u.addEventListener("click",()=>{m(this,rt,!1),this.refresh()}),(k=e.getElementById("saveProject"))==null||k.addEventListener("click",()=>{var x;const p=(x=e.getElementById("newProjectName"))==null?void 0:x.value.trim();if(!p){I.error("El nombre es requerido");return}try{const v=l.addProject({name:p});l.setActiveProject(v.id),m(this,rt,!1),I.success(`Proyecto "${p}" creado`)}catch(v){I.error(v.message)}}),e.querySelectorAll(".project-chevron").forEach(p=>{p.addEventListener("click",x=>{x.stopPropagation();const $=p.closest(".project-item").dataset.projectId;s(this,ot).has($)?s(this,ot).delete($):s(this,ot).add($),this.refresh()})}),e.querySelectorAll(".project-header").forEach(p=>{p.addEventListener("click",x=>{var $;if(x.target.closest(".action-btn")||x.target.closest(".project-chevron"))return;const v=($=p.closest(".project-item"))==null?void 0:$.dataset.projectId;v&&l.setActiveProject(v)})}),e.querySelectorAll(".sprint-item").forEach(p=>{p.addEventListener("click",x=>{if(x.target.closest(".action-btn"))return;const v=p.dataset.sprintId;l.setActiveSprint(v)})}),e.querySelectorAll(".all-tasks-row").forEach(p=>{p.addEventListener("click",()=>{const x=p.dataset.projectId;l.setActiveProject(x),l.setActiveSprint(null)})}),e.querySelectorAll(".sprint-add").forEach(p=>{p.addEventListener("click",x=>{x.stopPropagation();const v=p.closest(".project-item"),$=v==null?void 0:v.dataset.projectId;if(!$)return;const q=v.querySelector(".sprint-list"),C=v.querySelector("#newSprintForm");if(C){C.remove();return}q&&q.insertAdjacentHTML("beforeend",h(this,F,Gt).call(this,$));const D=v.querySelector("#newSprintForm");D.querySelector("#cancelSprint").addEventListener("click",()=>D.remove()),D.querySelector("#saveSprint").addEventListener("click",()=>{var U,Bt,Mt;const z=(U=D.querySelector("#newSprintName"))==null?void 0:U.value.trim(),tt=(Bt=D.querySelector("#newSprintStart"))==null?void 0:Bt.value,E=(Mt=D.querySelector("#newSprintEnd"))==null?void 0:Mt.value;if(!z){I.error("El nombre es requerido");return}try{l.addSprint({name:z,startDate:tt,endDate:E,projectId:$}),I.success(`Sprint "${z}" creado`)}catch(Kt){I.error(Kt.message)}})})}),e.querySelectorAll(".sprint-del").forEach(p=>{p.addEventListener("click",x=>{x.stopPropagation();const v=p.closest(".sprint-item"),$=v==null?void 0:v.dataset.sprintId;if(!$)return;e.querySelectorAll(".confirm-overlay").forEach(z=>z.remove()),e.querySelector(".sidebar-body").insertAdjacentHTML("beforeend",h(this,F,At).call(this,"Este sprint y sus tareas serán eliminados."));const q=e.getElementById("confirmYes"),C=e.getElementById("confirmNo"),D=e.getElementById("confirmOverlay");q==null||q.addEventListener("click",()=>{l.deleteSprint($),I.info("Sprint eliminado"),D.remove()}),C==null||C.addEventListener("click",()=>D.remove()),D==null||D.addEventListener("click",z=>{z.target===D&&D.remove()})})}),e.querySelectorAll(".project-del").forEach(p=>{p.addEventListener("click",x=>{x.stopPropagation();const v=p.closest(".project-item"),$=v==null?void 0:v.dataset.projectId;if(!$)return;const q=l.getProject($);e.querySelectorAll(".confirm-overlay").forEach(tt=>tt.remove()),e.querySelector(".sidebar-body").insertAdjacentHTML("beforeend",h(this,F,At).call(this,`El proyecto "${q==null?void 0:q.name}" y todos sus sprints serán eliminados.`));const C=e.getElementById("confirmYes"),D=e.getElementById("confirmNo"),z=e.getElementById("confirmOverlay");C==null||C.addEventListener("click",()=>{l.deleteProject($),I.info("Proyecto eliminado"),z.remove()}),D==null||D.addEventListener("click",()=>z.remove()),z==null||z.addEventListener("click",tt=>{tt.target===z&&z.remove()})})})}escapeHtml(t){const i=document.createElement("div");return i.textContent=t,i.innerHTML}}gt=new WeakMap,ut=new WeakMap,rt=new WeakMap,qt=new WeakMap,ot=new WeakMap,F=new WeakSet,Yt=function(t,i,e){if(!t)return'<div style="color:#6c7086;font-size:12px;padding:12px">Selecciona un producto</div>';const n=l.getProjects(t);return n.length===0?`
        <div style="color:#6c7086;font-size:12px;padding:8px">No hay proyectos</div>
        ${h(this,F,Dt).call(this)}
      `:`
      <div class="section-label">Proyectos</div>
      ${n.map(o=>{const a=l.getSprintsByProject(o.id),b=!s(this,ot).has(o.id);return`
          <div class="project-item" data-project-id="${o.id}">
            <div class="project-header ${o.id===i?"active":""}">
              <span class="project-chevron ${b?"open":""}">▸</span>
              <span class="project-name">${this.escapeHtml(o.name)}</span>
              <span class="project-count">${a.length}</span>
              <div class="project-actions">
                <button class="action-btn sprint-add" title="Nuevo sprint">➕</button>
                <button class="action-btn project-del delete" title="Eliminar proyecto">🗑️</button>
              </div>
            </div>
            ${b?`
              <div class="sprint-list">
                <div class="all-tasks-row ${!e&&o.id===i?"active":""}" data-scope="all" data-project-id="${o.id}">
                  <span class="sprint-dot"></span>
                  <span class="sprint-name">📋 Todas las tareas</span>
                </div>
                ${a.map(d=>{const u=l.getSprintStats(d.id);return`
                    <div class="sprint-item ${d.id===e?"active":""} ${d.status==="completed"?"completed":""}" data-sprint-id="${d.id}" data-project-id="${o.id}">
                      <span class="sprint-dot"></span>
                      <span class="sprint-name">${this.escapeHtml(d.name)}</span>
                      <span class="sprint-pts">${u.total}⭐</span>
                      <div class="sprint-actions">
                        <button class="action-btn sprint-del" title="Eliminar">🗑️</button>
                      </div>
                    </div>
                  `}).join("")}
              </div>
            `:""}
          </div>
        `}).join("")}
      ${s(this,rt)?h(this,F,Dt).call(this):`
        <button class="add-btn" id="showProjectForm">
          ➕ Nuevo proyecto
        </button>
      `}
    `},Dt=function(){return`
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
    `},Gt=function(t){return`
      <div class="create-form" id="newSprintForm" data-project-id="${t}">
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
    `},re=function(){return`
      <div class="create-form" id="newProductForm">
        <div class="form-title">Nuevo Producto</div>
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="newProductName" placeholder="Mi producto" />
        </div>
        <div class="form-actions">
          <button class="btn btn-secondary" id="cancelProduct">Cancelar</button>
          <button class="btn btn-primary" id="saveProduct">Crear</button>
        </div>
      </div>
    `},At=function(t){return`
      <div class="confirm-overlay" id="confirmOverlay">
        <div class="confirm-box">
          <h3>¿Eliminar?</h3>
          <p>${t}</p>
          <div class="form-actions">
            <button class="btn btn-secondary" id="confirmNo">Cancelar</button>
            <button class="btn btn-danger" id="confirmYes">Eliminar</button>
          </div>
        </div>
      </div>
    `};customElements.define("sprint-sidebar",se);var mt;class oe extends HTMLElement{constructor(){super();y(this,mt,null);this.attachShadow({mode:"open"})}connectedCallback(){m(this,mt,l.subscribe(()=>this.refresh())),this.refresh()}disconnectedCallback(){var t;(t=s(this,mt))==null||t.call(this)}refresh(){const t=l.getFilterCriteria(),i=l.getAllTags(),e=l.getStats(),n=t.search||t.priority||t.tag;this.render(t,i,e,n)}render(t,i,e,n){this.shadowRoot.innerHTML=`
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
          display: ${n?"flex":"none"};
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
          ${i.map(o=>`
            <option value="${this.escapeAttr(o)}" ${t.tag===o?"selected":""}>${this.escapeHtml(o)}</option>
          `).join("")}
        </select>
        
        <button class="clear-btn" id="clearBtn">
          ✕ Limpiar
        </button>
        
        <span class="results-count">
          ${e.filteredTotal!==e.total?`<strong>${e.filteredTotal}</strong> de ${e.total} tareas`:`<strong>${e.total}</strong> tareas`}
        </span>
      </div>
    `,this.setupEventListeners()}setupEventListeners(){const t=this.shadowRoot.getElementById("searchInput"),i=this.shadowRoot.getElementById("priorityFilter"),e=this.shadowRoot.getElementById("tagFilter"),n=this.shadowRoot.getElementById("clearBtn");let o;t==null||t.addEventListener("input",a=>{clearTimeout(o),o=setTimeout(()=>{l.setFilterCriteria({search:a.target.value})},150)}),i==null||i.addEventListener("change",a=>{l.setFilterCriteria({priority:a.target.value})}),e==null||e.addEventListener("change",a=>{l.setFilterCriteria({tag:a.target.value})}),n==null||n.addEventListener("click",()=>{l.clearFilters(),t.value="",i.value="",e.value=""})}focusSearch(){var t;(t=this.shadowRoot.getElementById("searchInput"))==null||t.focus()}escapeHtml(t){const i=document.createElement("div");return i.textContent=t,i.innerHTML}escapeAttr(t){return t.replace(/"/g,"&quot;").replace(/'/g,"&#39;")}}mt=new WeakMap;customElements.define("filter-bar",oe);const Pt={[j.TODO]:{title:"📋 To Do",color:"#89b4fa"},[j.IN_PROGRESS]:{title:"⚡ In Progress",color:"#f9e2af"},[j.DONE]:{title:"✅ Done",color:"#a6e3a1"}};var M,G,xt,K,Ct,zt;class ne extends HTMLElement{constructor(){super();y(this,M,null);y(this,G,[]);y(this,xt,null);y(this,K,!1);y(this,Ct,null);y(this,zt,null);this.attachShadow({mode:"open"})}static get observedAttributes(){return["status"]}connectedCallback(){m(this,xt,l.subscribe(()=>this.refresh())),this.setupDropZone(),this.refresh()}disconnectedCallback(){var t;(t=s(this,xt))==null||t.call(this)}attributeChangedCallback(t,i,e){t==="status"&&i!==e&&(m(this,M,e),this.refresh())}set status(t){m(this,M,t),this.refresh()}refresh(){if(!s(this,M))return;const t=l.getFilterCriteria();let e=l.getFilteredTasks(t).filter(n=>n.status===s(this,M));e=e.sort((n,o)=>(n.position||0)-(o.position||0)),m(this,G,e),this.render(),this.setupDropZone()}setupDropZone(){const t=this.shadowRoot.querySelector(".column"),i=this.shadowRoot.querySelector(".task-list");!t||!i||(t.addEventListener("dragover",e=>{var b;e.preventDefault(),e.dataTransfer.dropEffect="move",t.classList.add("drag-over");const n=Array.from(i.querySelectorAll("task-card")),o=this.getDragAfterElement(n,e.clientY);i.querySelectorAll(".drop-indicator").forEach(d=>d.remove());const a=document.createElement("div");a.className="drop-indicator",a.style.cssText=`
        height: 3px;
        background: ${((b=Pt[s(this,M)])==null?void 0:b.color)||"#89b4fa"};
        border-radius: 2px;
        margin: 4px 0;
      `,o?i.insertBefore(a,o):i.appendChild(a)}),t.addEventListener("dragleave",e=>{t.contains(e.relatedTarget)||(t.classList.remove("drag-over"),i.querySelectorAll(".drop-indicator").forEach(n=>n.remove()))}),t.addEventListener("drop",e=>{var u;e.preventDefault(),t.classList.remove("drag-over"),i.querySelectorAll(".drop-indicator").forEach(k=>k.remove());const n=e.dataTransfer.getData("text/plain");if(!n)return;const o=l.getTask(n);if(!o)return;const a=Array.from(i.querySelectorAll("task-card")),b=this.getDragAfterElement(a,e.clientY);let d=0;b?d=a.indexOf(b):d=a.length,o.status===s(this,M)?l.reorderTask(n,s(this,M),d):(l.moveTask(n,s(this,M)),d>0&&l.reorderTask(n,s(this,M),d)),I.success(`Tarea movida a ${((u=Pt[s(this,M)])==null?void 0:u.title)||s(this,M)}`),lt.emit(ct.TASK_MOVED,{taskId:n,newStatus:s(this,M)})}))}getDragAfterElement(t,i){return t.reduce((e,n)=>{const o=n.getBoundingClientRect(),a=i-o.top-o.height/2;return a<0&&a>e.offset?{offset:a,element:n}:e},{offset:Number.NEGATIVE_INFINITY}).element}render(){const t=Pt[s(this,M)]||{title:"Unknown",color:"#6c7086"},i=s(this,G).reduce((n,o)=>n+(o.storyPoints||0),0),e=s(this,G).length===0;this.shadowRoot.innerHTML=`
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
            <span class="task-count">${s(this,G).length}</span>
          </span>
          <div class="column-actions">
            <span class="points-badge">${i} pts</span>
            <button class="btn-add-task" id="quickAddBtn" title="Agregar tarea">➕</button>
            <button class="btn-select-all" id="selectAllBtn" title="Seleccionar todos">☐</button>
          </div>
        </div>
        
        ${s(this,K)?`
          <div class="quick-add-form">
            <input type="text" class="quick-add-input" id="quickAddInput" placeholder="Nombre de la tarea..." />
            <button class="quick-add-btn" id="quickAddSubmit">+</button>
          </div>
        `:""}
        
        <div class="task-list ${e?"empty":""}">
          ${e&&!s(this,K)?`
            <div class="empty-content">
              <div class="empty-icon">📭</div>
              <div class="empty-message">Sin tareas</div>
              <div class="empty-message" style="margin-top:4px;font-size:11px">Arrastra aquí o presiona N</div>
            </div>
          `:e?`
            <div class="empty-content">
              <div class="empty-icon">📭</div>
              <div class="empty-message">Sin tareas</div>
            </div>
          `:s(this,G).map(n=>`<task-card task-id="${n.id}"></task-card>`).join("")}
        </div>
      </div>
    `,this.setupEventListeners(),this.setupDropZone()}setupEventListeners(){var i,e,n;(i=this.shadowRoot.getElementById("quickAddBtn"))==null||i.addEventListener("click",()=>{m(this,K,!0),this.render(),setTimeout(()=>{var o;(o=this.shadowRoot.getElementById("quickAddInput"))==null||o.focus()},10)});const t=this.shadowRoot.getElementById("quickAddInput");t==null||t.addEventListener("keydown",o=>{if(o.key==="Enter"){const a=o.target.value.trim();a&&(l.addTaskQuick(a,s(this,M)),I.success("Tarea creada")),m(this,K,!1),this.refresh()}else o.key==="Escape"&&(m(this,K,!1),this.refresh())}),(e=this.shadowRoot.getElementById("quickAddSubmit"))==null||e.addEventListener("click",()=>{const o=this.shadowRoot.getElementById("quickAddInput"),a=o==null?void 0:o.value.trim();a&&(l.addTaskQuick(a,s(this,M)),I.success("Tarea creada")),m(this,K,!1),this.refresh()}),(n=this.shadowRoot.getElementById("selectAllBtn"))==null||n.addEventListener("click",()=>{s(this,G).forEach(o=>{window.dispatchEvent(new CustomEvent("toggle-task-selection",{detail:{taskId:o.id}}))})})}}M=new WeakMap,G=new WeakMap,xt=new WeakMap,K=new WeakMap,Ct=new WeakMap,zt=new WeakMap;customElements.define("task-column",ne);const ae={[st.LOW]:"#22c55e",[st.MEDIUM]:"#f59e0b",[st.HIGH]:"#f97316",[st.CRITICAL]:"#ef4444"};var N,ht,nt;class de extends HTMLElement{constructor(){super();y(this,N,null);y(this,ht,!1);y(this,nt,!1);this.attachShadow({mode:"open"})}static get observedAttributes(){return["task-id"]}connectedCallback(){this.render(),this.setupDrag(),this.setupSelection()}attributeChangedCallback(t,i,e){t==="task-id"&&i!==e&&(m(this,N,l.getTask(e)),this.render())}set task(t){m(this,N,t),this.render(),this.setupDrag(),this.setupSelection()}get task(){return s(this,N)}set selected(t){m(this,ht,t);const i=this.shadowRoot.querySelector(".card");i&&i.classList.toggle("selected",t)}get selected(){return s(this,ht)}set checked(t){m(this,nt,t);const i=this.shadowRoot.querySelector(".card-checkbox");if(i){i.checked=t;const e=this.shadowRoot.querySelector(".card");e==null||e.classList.toggle("checked",t)}}get checked(){return s(this,nt)}setupSelection(){const t=this.shadowRoot.querySelector(".card"),i=this.shadowRoot.querySelector(".card-checkbox");t&&(t.addEventListener("click",e=>{e.target.closest(".card-checkbox")||e.target.closest(".actions")||window.dispatchEvent(new CustomEvent("open-task-detail",{detail:{taskId:s(this,N).id},bubbles:!0}))}),i==null||i.addEventListener("click",e=>{e.stopPropagation(),window.dispatchEvent(new CustomEvent("toggle-task-selection",{detail:{taskId:s(this,N).id},bubbles:!0}))}))}setupDrag(){const t=this.shadowRoot.querySelector(".card");t&&(t.setAttribute("draggable","true"),t.addEventListener("dragstart",i=>{i.dataTransfer.setData("text/plain",s(this,N).id),i.dataTransfer.effectAllowed="move",t.classList.add("dragging"),lt.emit(ct.DRAG_START,{taskId:s(this,N).id,status:s(this,N).status})}),t.addEventListener("dragend",()=>{t.classList.remove("dragging"),lt.emit(ct.DRAG_END,{})}))}render(){if(!s(this,N))return;const{id:t,title:i,description:e,priority:n,storyPoints:o,tags:a}=s(this,N),b=a.length>0?`<div class="tags">${a.map(k=>`<span class="tag">${this.escapeHtml(k)}</span>`).join("")}</div>`:"",d=o!==null?`<span class="points">${o}</span>`:"",u=e.length>80?e.substring(0,80)+"...":e;this.shadowRoot.innerHTML=`
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
      <div class="card ${s(this,ht)?"selected":""} ${s(this,nt)?"checked":""}">
        <div class="card-checkbox-wrap">
          <input type="checkbox" class="card-checkbox" ${s(this,nt)?"checked":""} />
        </div>
        <div class="card-header">
          <span class="priority-dot" style="background: ${ae[n]}"></span>
          <p class="title">${this.escapeHtml(i)}</p>
        </div>
        ${u?`<p class="description">${this.escapeHtml(u)}</p>`:""}
        ${b}
        <div class="card-footer">
          ${d}
          <div class="actions">
            <button class="btn-action edit" title="Editar" data-action="edit">✏️</button>
            <button class="btn-action delete" title="Eliminar" data-action="delete">🗑️</button>
          </div>
        </div>
      </div>
    `,this.setupSelection(),this.setupDrag(),this.shadowRoot.querySelectorAll(".btn-action").forEach(k=>{k.addEventListener("click",p=>{p.stopPropagation();const x=k.dataset.action;x==="edit"?this.dispatchEvent(new CustomEvent("task-edit",{detail:{id:t},bubbles:!0,composed:!0})):x==="delete"&&confirm("¿Eliminar esta tarea?")&&l.deleteTask(t)})})}escapeHtml(t){const i=document.createElement("div");return i.textContent=t,i.innerHTML}}N=new WeakMap,ht=new WeakMap,nt=new WeakMap;customElements.define("task-card",de);var at,J;class ce extends HTMLElement{constructor(){super(...arguments);y(this,at,null);y(this,J,!1)}connectedCallback(){this.addEventListener("task-edit",t=>{const i=l.getTask(t.detail.id);i&&(m(this,at,i),m(this,J,!0),this.show())}),this.addEventListener("open-create-modal",()=>{m(this,at,null),m(this,J,!1),this.show()}),this.addEventListener("keydown",t=>{t.key==="Escape"&&this.hide()})}show(){this.style.display="flex",this.render(),requestAnimationFrame(()=>{var t;(t=this.querySelector(".modal-backdrop"))==null||t.classList.add("active")})}hide(){const t=this.querySelector(".modal-backdrop");t?(t.classList.remove("active"),setTimeout(()=>{this.style.display="none",this.innerHTML=""},200)):this.style.display="none"}render(){const t=s(this,at)||{title:"",description:"",status:j.TODO,priority:st.MEDIUM,storyPoints:null,tags:[]};this.innerHTML=`
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
            <h2 class="modal-title">${s(this,J)?"✏️ Editar tarea":"➕ Nueva tarea"}</h2>
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
            <div class="form-group" id="sprintFormGroup" style="display:${l.getActiveProjectId()?"block":"none"}">
              <label for="sprintSelect">Sprint</label>
              <select id="sprintSelect" name="sprint">
                <option value="">— Sin sprint —</option>
                ${l.getSprints(l.getActiveProjectId()).map(i=>`
                  <option value="${i.id}" ${(t.sprintId??l.getActiveSprintId())===i.id?"selected":""}>${this.escapeHtml(i.name)}</option>
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
                ${(t.tags||[]).map(i=>`
                  <span class="tag-item">
                    ${this.escapeHtml(i)}
                    <button type="button" class="tag-remove" data-tag="${this.escapeAttr(i)}">✕</button>
                  </span>
                `).join("")}
                <input type="text" class="tag-input-field" placeholder="Agregar tag..." id="tagInputField" />
              </div>
            </div>
            <button type="submit" class="btn-submit">
              ${s(this,J)?"💾 Guardar cambios":"🚀 Crear tarea"}
            </button>
          </form>
        </div>
      </div>
    `,this.setupEventListeners()}setupEventListeners(){var i,e,n;(i=this.querySelector("#closeBtn"))==null||i.addEventListener("click",()=>this.hide()),(e=this.querySelector(".modal-backdrop"))==null||e.addEventListener("click",o=>{o.target.classList.contains("modal-backdrop")&&this.hide()}),this.querySelectorAll(".priority-option").forEach(o=>{o.addEventListener("click",()=>{this.querySelectorAll(".priority-option").forEach(a=>a.classList.remove("selected")),o.classList.add("selected")})});const t=this.querySelector("#tagInputField");t==null||t.addEventListener("keydown",o=>{if(o.key==="Enter"||o.key===","){o.preventDefault();const a=t.value.trim().replace(",","");a&&(this.addTagToUI(a),t.value="")}}),this.querySelectorAll(".tag-remove").forEach(o=>{o.addEventListener("click",()=>{o.parentElement.remove()})}),(n=this.querySelector("#taskForm"))==null||n.addEventListener("submit",o=>{o.preventDefault(),this.handleSubmit()})}addTagToUI(t){var a;const i=this.querySelector("#tagsInput"),e=this.querySelector("#tagInputField");if(!i||Array.from(i.querySelectorAll(".tag-item")).map(b=>b.textContent.replace("✕","").trim()).includes(t))return;const o=document.createElement("span");o.className="tag-item",o.innerHTML=`${this.escapeHtml(t)}<button type="button" class="tag-remove" data-tag="${this.escapeAttr(t)}">✕</button>`,i.insertBefore(o,e),(a=o.querySelector(".tag-remove"))==null||a.addEventListener("click",()=>o.remove())}handleSubmit(){var u,k,p,x,v,$;const t=(u=this.querySelector("#title"))==null?void 0:u.value.trim(),i=((k=this.querySelector("#description"))==null?void 0:k.value.trim())||"",e=((p=this.querySelector("#status"))==null?void 0:p.value)||"todo",n=(x=this.querySelector("#storyPoints"))==null?void 0:x.value,o=((v=this.querySelector(".priority-option.selected"))==null?void 0:v.dataset.priority)||"medium",a=Array.from(this.querySelectorAll(".tag-item")).map(q=>q.textContent.replace("✕","").trim()),b=(($=this.querySelector("#sprintSelect"))==null?void 0:$.value)||null,d={title:t,description:i,status:e,priority:o,storyPoints:n?parseInt(n,10):null,tags:a,sprintId:b};try{s(this,J)?l.updateTask(s(this,at).id,d):l.addTask(d),this.hide()}catch(q){const C=this.querySelector(".error-message")||this.insertErrorEl();C&&(C.textContent=q.message)}}insertErrorEl(){var i;const t=document.createElement("div");return t.className="error-message",(i=this.querySelector("#taskForm"))==null||i.appendChild(t),t}escapeHtml(t){const i=document.createElement("div");return i.textContent=t,i.innerHTML}escapeAttr(t){return t.replace(/"/g,"&quot;").replace(/'/g,"&#39;")}}at=new WeakMap,J=new WeakMap;customElements.define("task-modal",ce);var O,_,vt;class le extends HTMLElement{constructor(){super();y(this,O,null);y(this,_,!1);y(this,vt,null);this.attachShadow({mode:"open"})}connectedCallback(){m(this,vt,l.subscribe(()=>this.refresh())),document.addEventListener("keydown",this.handleKeydown.bind(this))}disconnectedCallback(){var t;(t=s(this,vt))==null||t.call(this),document.removeEventListener("keydown",this.handleKeydown.bind(this))}handleKeydown(t){t.key==="Escape"&&this.style.display!=="none"&&this.hide()}show(t){m(this,O,l.getTask(t)),s(this,O)&&(m(this,_,!1),this.style.display="flex",this.render(),requestAnimationFrame(()=>{var i;(i=this.querySelector(".detail-backdrop"))==null||i.classList.add("active")}))}hide(){const t=this.querySelector(".detail-backdrop");t?(t.classList.remove("active"),setTimeout(()=>{this.style.display="none",this.innerHTML=""},200)):this.style.display="none"}refresh(){if(s(this,O)){const t=l.getTask(s(this,O).id);t?(m(this,O,t),s(this,_)||this.render()):this.hide()}}render(){if(!s(this,O))return;const{id:t,title:i,description:e,status:n,priority:o,storyPoints:a,tags:b,sprintId:d,createdAt:u,updatedAt:k}=s(this,O),p=d?l.getSprint(d):null,x=p?p.name:"Backlog";this.innerHTML=`
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
            <h2 class="detail-title">${s(this,_)?"✏️ Editar tarea":"📋 Detalle"}</h2>
            <button class="btn-close" id="closeBtn">✕</button>
          </div>
          
          ${s(this,_)?this.renderEditForm():this.renderViewMode(t,i,e,n,o,a,b,x,u,k,sprintLabels)}
          
          <div class="detail-actions">
            ${s(this,_)?`
              <button class="btn btn-cancel" id="cancelBtn">Cancelar</button>
              <button class="btn btn-save" id="saveBtn">💾 Guardar</button>
            `:`
              <select class="move-select" id="moveSelect">
                <option value="">Mover a...</option>
                <option value="todo" ${n==="todo"?"disabled":""}>📋 To Do</option>
                <option value="in_progress" ${n==="in_progress"?"disabled":""}>⚡ In Progress</option>
                <option value="done" ${n==="done"?"disabled":""}>✅ Done</option>
              </select>
              <button class="btn btn-edit" id="editBtn">✏️ Editar</button>
              <button class="btn btn-delete" id="deleteBtn">🗑️</button>
            `}
          </div>
        </div>
      </div>
    `,this.setupEventListeners()}renderViewMode(t,i,e,n,o,a,b,d,u,k){const p={low:"🟢 Baja",medium:"🟡 Media",high:"🟠 Alta",critical:"🔴 Crítica"},x={todo:"📋 To Do",in_progress:"⚡ In Progress",done:"✅ Done"};return`
      <div class="detail-body">
        <div class="detail-section">
          <div class="detail-value title-value">${this.escapeHtml(i)}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Descripción</div>
          <div class="detail-value">${e?this.escapeHtml(e):'<em style="color:#6c7086">Sin descripción</em>'}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Estado</div>
          <span class="meta-badge status-${n}">${x[n]}</span>
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
        
        ${b&&b.length>0?`
          <div class="detail-section">
            <div class="detail-label">Tags</div>
            <div class="tag-list">
              ${b.map(v=>`<span class="tag">${this.escapeHtml(v)}</span>`).join("")}
            </div>
          </div>
        `:""}
        
        <div class="detail-section">
          <div class="detail-label">Sprint</div>
          <div class="detail-value">${this.escapeHtml(d)}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Fechas</div>
          <div class="detail-meta">
            <div class="meta-item">
              <span class="detail-label" style="margin-bottom:2px">Creado</span>
              <span class="detail-value">${new Date(u).toLocaleDateString("es-ES")}</span>
            </div>
            <div class="meta-item">
              <span class="detail-label" style="margin-bottom:2px">Actualizado</span>
              <span class="detail-value">${new Date(k).toLocaleDateString("es-ES")}</span>
            </div>
          </div>
        </div>
      </div>
    `}renderEditForm(){const t=s(this,O);return`
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
    `}setupEventListeners(){var a,b;(a=this.querySelector("#closeBtn"))==null||a.addEventListener("click",()=>this.hide()),(b=this.querySelector(".detail-backdrop"))==null||b.addEventListener("click",d=>{d.target.classList.contains("detail-backdrop")&&this.hide()});const t=this.querySelector("#editBtn");t==null||t.addEventListener("click",()=>{m(this,_,!0),this.render()});const i=this.querySelector("#deleteBtn");i==null||i.addEventListener("click",()=>{if(confirm("¿Eliminar esta tarea?")){const d=s(this,O).id,u=s(this,O).title,k={...s(this,O)};l.deleteTask(d),I.delete(`Tarea "${u}" eliminada`,()=>{try{l.addTask(k)}catch{I.error("No se pudo deshacer")}}),this.hide()}});const e=this.querySelector("#moveSelect");e==null||e.addEventListener("change",d=>{d.target.value&&(l.moveTask(s(this,O).id,d.target.value),I.success(`Tarea movida a ${d.target.options[d.target.selectedIndex].text}`),lt.emit(ct.TASK_MOVED,{taskId:s(this,O).id,newStatus:d.target.value}))});const n=this.querySelector("#cancelBtn");n==null||n.addEventListener("click",()=>{m(this,_,!1),this.render()});const o=this.querySelector("#saveBtn");o==null||o.addEventListener("click",()=>{var x,v,$,q;const d=(x=this.querySelector("#editTitle"))==null?void 0:x.value.trim(),u=((v=this.querySelector("#editDescription"))==null?void 0:v.value.trim())||"",k=($=this.querySelector("#editPoints"))==null?void 0:$.value,p=(q=this.querySelector(".priority-option.selected"))==null?void 0:q.dataset.priority;if(!d){I.error("El título es requerido");return}try{l.updateTask(s(this,O).id,{title:d,description:u,storyPoints:k?parseInt(k,10):null,priority:p}),m(this,_,!1),I.success("Tarea actualizada"),this.render()}catch(C){I.error(C.message)}}),this.querySelectorAll(".priority-option").forEach(d=>{d.addEventListener("click",()=>{this.querySelectorAll(".priority-option").forEach(u=>u.classList.remove("selected")),d.classList.add("selected")})})}escapeHtml(t){const i=document.createElement("div");return i.textContent=t,i.innerHTML}escapeAttr(t){return(t||"").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}}O=new WeakMap,_=new WeakMap,vt=new WeakMap;customElements.define("task-detail",le);var dt,yt;class pe extends HTMLElement{constructor(){super();y(this,dt,!0);y(this,yt,null);this.attachShadow({mode:"open"})}connectedCallback(){m(this,yt,l.subscribe(()=>this.refresh())),this.refresh()}disconnectedCallback(){var t;(t=s(this,yt))==null||t.call(this)}refresh(){const t=l.getSelectedSprintId();if(!t){this.renderEmpty();return}const i=l.getSprint(t);if(!i){this.renderEmpty();return}const e=l.getTasksBySprint(t),n=e.reduce((p,x)=>p+(x.storyPoints||0),0),o=new Date(i.startDate),a=new Date(i.endDate),b=new Date,d=this.getDaysBetween(o,a);Math.max(0,Math.min(d,this.getDaysBetween(o,b)));const u=[];for(let p=0;p<=d;p++){const x=n-n/d*p;u.push({day:p,points:Math.max(0,x)})}const k=this.calculateActualBurndown(e,o,d,n);this.render(i,n,d,u,k,s(this,dt))}getDaysBetween(t,i){return Math.ceil((i-t)/864e5)+1}calculateActualBurndown(t,i,e,n){const o=t.filter(u=>u.status===j.DONE),a=new Map;for(let u=0;u<=e;u++)a.set(u,0);o.forEach(u=>{const k=new Date(u.updatedAt),p=Math.max(0,Math.min(e,this.getDaysBetween(i,k))),x=a.get(p)||0;a.set(p,x+(u.storyPoints||0))});const b=[];let d=n;for(let u=0;u<=e;u++){const k=a.get(u)||0;d=d-k,b.push({day:u,points:Math.max(0,d)})}return b}renderEmpty(){this.shadowRoot.innerHTML=`
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
        <span class="toggle-icon ${s(this,dt)?"":"expanded"}">▼</span>
      </div>
    `,this.setupEventListeners()}render(t,i,e,n,o,a){const u={top:20,right:30,bottom:30,left:50},k=600-u.left-u.right,p=200-u.top-u.bottom,x=E=>u.left+E/e*k,v=E=>u.top+p-E/i*p,$=n.map((E,U)=>`${U===0?"M":"L"} ${x(E.day)} ${v(E.points)}`).join(" "),q=o.map((E,U)=>`${U===0?"M":"L"} ${x(E.day)} ${v(E.points)}`).join(" "),C=[],D=Math.ceil(i/5);for(let E=0;E<=i;E+=D)C.push(E);const z=[],tt=Math.max(1,Math.floor(e/6));for(let E=0;E<=e;E+=tt)z.push(E);this.shadowRoot.innerHTML=`
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
          <span class="sprint-name">${t.name} - ${i} puntos totales</span>
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
          ${C.map(E=>`
            <line class="grid-line" 
              x1="${u.left}" 
              y1="${v(E)}" 
              x2="${600-u.right}" 
              y2="${v(E)}" />
          `).join("")}
          
          <!-- Y-axis labels -->
          ${C.map(E=>`
            <text class="axis-label" x="${u.left-8}" y="${v(E)+3}" text-anchor="end">${E}</text>
          `).join("")}
          
          <!-- X-axis labels -->
          ${z.map(E=>`
            <text class="axis-label" x="${x(E)}" y="192" text-anchor="middle">Día ${E}</text>
          `).join("")}
          
          <!-- Ideal burndown line -->
          <path class="ideal-line" d="${$}" />
          
          <!-- Actual burndown line -->
          <path class="actual-line" d="${q}" />
          
          <!-- Data points for actual -->
          ${o.filter((E,U)=>U%Math.max(1,Math.floor(e/8))===0||U===o.length-1).map(E=>`
            <circle class="data-point" cx="${x(E.day)}" cy="${v(E.points)}" />
          `).join("")}
        </svg>
      </div>
    `,this.setupEventListeners()}setupEventListeners(){var t;(t=this.shadowRoot.getElementById("toggle"))==null||t.addEventListener("click",()=>{m(this,dt,!s(this,dt)),this.refresh()})}}dt=new WeakMap,yt=new WeakMap;customElements.define("burndown-chart",pe);let L=null,H=new Set;function ue(){const c=document.getElementById("app");if(!c)return;c.innerHTML=`
    <app-header></app-header>
    <div class="main-container">
      <sprint-sidebar></sprint-sidebar>
      <div class="content-area">
        <filter-bar></filter-bar>
        <main class="board">
          <task-column status="${j.TODO}"></task-column>
          <task-column status="${j.IN_PROGRESS}"></task-column>
          <task-column status="${j.DONE}"></task-column>
        </main>
        <burndown-chart></burndown-chart>
      </div>
    </div>
    <task-modal></task-modal>
    <task-detail></task-detail>
    <bulk-action-bar></bulk-action-bar>
  `;const r=document.createElement("style");r.textContent=`
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
  `,c.appendChild(r);const t=c.querySelector("task-detail");class i extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.addEventListener("update-bulk-bar",()=>this.render())}render(){const a=H.size;this.shadowRoot.innerHTML=`
        <style>
          :host {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 800;
            display: ${a>0?"block":"none"};
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
          <span class="bulk-count">${a} seleccionada${a!==1?"s":""}</span>
          <select class="bulk-select" id="bulkMoveSelect">
            <option value="">Mover a...</option>
            <option value="todo">📋 To Do</option>
            <option value="in_progress">⚡ In Progress</option>
            <option value="done">✅ Done</option>
          </select>
          <button class="bulk-btn delete" id="bulkDeleteBtn">🗑️ Eliminar</button>
          <button class="bulk-btn clear" id="bulkClearBtn">Limpiar</button>
        </div>
      `,this.setupListeners()}setupListeners(){const a=this.shadowRoot.getElementById("bulkMoveSelect");a==null||a.addEventListener("change",u=>{u.target.value&&(H.forEach(k=>{l.moveTask(k,u.target.value)}),I.success(`${H.size} tareas movidas`),n())});const b=this.shadowRoot.getElementById("bulkDeleteBtn");b==null||b.addEventListener("click",()=>{if(confirm(`¿Eliminar ${H.size} tareas?`)){const u=H.size;H.forEach(k=>{l.deleteTask(k)}),I.info(`${u} tareas eliminadas`),n()}});const d=this.shadowRoot.getElementById("bulkClearBtn");d==null||d.addEventListener("click",()=>{n()})}}customElements.define("bulk-action-bar",i),window.addEventListener("open-task-detail",o=>{t==null||t.show(o.detail.taskId)}),window.addEventListener("toggle-task-selection",o=>{e(o.detail.taskId)}),document.addEventListener("keydown",o=>{var d,u,k,p;const b=o.target.matches("input, textarea, select");if(o.key==="Escape"){t==null||t.hide(),(d=document.querySelector("task-modal"))==null||d.hide(),n();return}if(!b){if(o.key==="n"||o.key==="N"){o.preventDefault(),(u=c.querySelector("task-modal"))==null||u.dispatchEvent(new CustomEvent("open-create-modal"));return}if(o.key==="f"||o.key==="F"||o.key==="/"){o.preventDefault(),(k=document.querySelector("filter-bar"))==null||k.focusSearch();return}if(o.key==="1"&&L){o.preventDefault(),l.moveTask(L,j.TODO),I.success("Tarea movida a To Do"),lt.emit(ct.TASK_MOVED,{taskId:L,newStatus:j.TODO});return}if(o.key==="2"&&L){o.preventDefault(),l.moveTask(L,j.IN_PROGRESS),I.success("Tarea movida a In Progress"),lt.emit(ct.TASK_MOVED,{taskId:L,newStatus:j.IN_PROGRESS});return}if(o.key==="3"&&L){o.preventDefault(),l.moveTask(L,j.DONE),I.success("Tarea movida a Done"),lt.emit(ct.TASK_MOVED,{taskId:L,newStatus:j.DONE});return}if((o.key==="e"||o.key==="E")&&L){o.preventDefault(),(p=c.querySelector("task-modal"))==null||p.dispatchEvent(new CustomEvent("task-edit",{detail:{id:L},bubbles:!0}));return}if((o.key==="Delete"||o.key==="Backspace")&&L){o.preventDefault(),confirm("¿Eliminar esta tarea?")&&(l.deleteTask(L),I.info("Tarea eliminada"),L=null);return}}});function e(o){H.has(o)?H.delete(o):H.add(o),H.size===1?L=Array.from(H)[0]:H.size===0&&(L=null),document.querySelectorAll("task-card").forEach(a=>{const b=a.getAttribute("task-id");a.selected=b===L,a.checked=H.has(b)}),window.dispatchEvent(new CustomEvent("update-bulk-bar"))}function n(){H.clear(),L=null,document.querySelectorAll("task-card").forEach(o=>{o.selected=!1,o.checked=!1}),window.dispatchEvent(new CustomEvent("update-bulk-bar"))}l.subscribe(()=>{L&&!l.getTask(L)&&(L=null,H.clear(),window.dispatchEvent(new CustomEvent("update-bulk-bar")))})}document.addEventListener("DOMContentLoaded",()=>{ue()});
