'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Empty, Btn, Tag, Modal, Pill, friendlyDate, describeType } from '../../components/UI';

export default function AgentsPage() {
  const [tableAgents, setTableAgents] = useState([]);
  const [memoryAgents, setMemoryAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [editTarget, setEditTarget] = useState('table');
  const [tab, setTab] = useState('table');
  const [search, setSearch] = useState('');
  const [actions, setActions] = useState({});
  const [actionsLoading, setActionsLoading] = useState({});

  async function load() {
    setLoading(true);
    const d = await fetch('/api/agents').then(r=>r.json());
    setTableAgents(d.table_agents||[]); setMemoryAgents(d.memory_agents||[]); setLoading(false);
  }
  useEffect(()=>{load();},[]);

  async function loadActions(agentId) {
    setActionsLoading(prev=>({...prev,[agentId]:true}));
    const d = await fetch(`/api/agents/actions?agent=${agentId}`).then(r=>r.json());
    setActions(prev=>({...prev,[agentId]:d.actions||[]}));
    setActionsLoading(prev=>({...prev,[agentId]:false}));
  }

  function openEditTable(agent) { setEditData({...agent}); setEditing(agent); setEditTarget('table'); }
  function openEditMemory(agent) { setEditData({id:agent.id,content:agent.content||''}); setEditing(agent); setEditTarget('memory'); }

  async function saveAgent() {
    const {id,...updates}=editData;
    await fetch('/api/agents',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,target:editTarget,...updates})});
    setEditing(null); load();
  }

  const filteredTable = tableAgents.filter(a => !search || (a.agent_id+' '+a.full_name+' '+(a.department||'')).toLowerCase().includes(search.toLowerCase()));
  const filteredMemory = memoryAgents.filter(a => !search || (a.source+' '+(a.content||'')).toLowerCase().includes(search.toLowerCase()));

  if(loading) return <Loading/>;

  return (<div>
    <PageTitle right={<span className="text-dim text-xs">{tableAgents.length} table + {memoryAgents.length} brain</span>}>Agent Job Descriptions</PageTitle>
    <div className="flex gap-2 mb-4">
      <input className="flex-1" placeholder="Search agents..." value={search} onChange={e=>setSearch(e.target.value)} />
      <Btn variant={tab==='table'?'primary':'default'} size="md" onClick={()=>setTab('table')}>Registry ({tableAgents.length})</Btn>
      <Btn variant={tab==='memory'?'primary':'default'} size="md" onClick={()=>setTab('memory')}>Brain JDs ({memoryAgents.length})</Btn>
      <Btn onClick={load}>Refresh</Btn>
    </div>

    <div className="glass-card p-1 mb-3 text-xs text-yellow-400/80 px-3 py-2">AIR loads agent JDs from the <strong>aba_agent_jds table</strong> (Registry tab). The 320 detailed Brain JDs are NOT loaded into the Fat Context Window. This is a known gap.</div>

    {tab==='table'&&(<Card title="aba_agent_jds (what AIR actually loads)">
      <table><thead><tr><th>Agent</th><th>Full Name</th><th>Dept</th><th>Type</th><th>Tier</th><th>Last 5 Actions</th><th></th></tr></thead>
      <tbody>{filteredTable.map(a=>(
        <tr key={a.id} data-aba-ctx={JSON.stringify({type:'agent',label:a.agent_id,data:{agent_id:a.agent_id,full_name:a.full_name,department:a.department}})}>
          <td className="font-semibold text-white">{a.agent_id}</td>
          <td>{a.full_name}</td>
          <td><Pill>{a.department||'-'}</Pill></td>
          <td className="text-xs">{a.agent_type||'-'}</td>
          <td>{a.tier||'-'}</td>
          <td>
            {actions[a.agent_id] ? (
              <div className="space-y-1">{actions[a.agent_id].map(act=>(
                <div key={act.id} className="text-[10px] text-dim">{friendlyDate(act.created_at).split(' ').slice(0,2).join(' ')}: {(act.content||'').slice(0,60)}</div>
              ))}{actions[a.agent_id].length===0&&<span className="text-dim text-[10px]">No recent activity</span>}</div>
            ) : (
              <Btn size="sm" onClick={()=>loadActions(a.agent_id)} disabled={actionsLoading[a.agent_id]}>
                {actionsLoading[a.agent_id]?'Loading...':'Load'}
              </Btn>
            )}
          </td>
          <td><Btn onClick={()=>openEditTable(a)}>Edit</Btn></td>
        </tr>
      ))}</tbody></table>
    </Card>)}

    {tab==='memory'&&(<Card title="aba_memory (detailed JDs, NOT loaded by AIR)">
      <table><thead><tr><th>Source</th><th>Content Preview</th><th></th></tr></thead>
      <tbody>{filteredMemory.map(a=>(
        <tr key={a.id} data-aba-ctx={JSON.stringify({type:'brain_agent_jd',label:a.source,data:{source:a.source}})}>
          <td className="mono max-w-[200px] truncate">{a.source}</td>
          <td className="max-w-[400px]">{(a.content||'').slice(0,200)}</td>
          <td><Btn onClick={()=>openEditMemory(a)}>Edit</Btn></td>
        </tr>
      ))}</tbody></table>
    </Card>)}

    <Modal open={!!editing} onClose={()=>setEditing(null)} title={`Edit: ${editing?.agent_id||editing?.source||''}`}>
      {editing&&editTarget==='table'&&(<div className="space-y-3">
        {Object.entries(editData).filter(([k])=>!['id','created_at','updated_at'].includes(k)).map(([key,val])=>{
          const sv=typeof val==='object'&&val!==null?JSON.stringify(val,null,2):String(val||'');
          return (<div key={key}><label className="text-[10px] text-dim uppercase">{key}</label>
            {sv.length>80?<textarea rows={4} value={typeof editData[key]==='object'?JSON.stringify(editData[key],null,2):(editData[key]||'')} onChange={e=>setEditData({...editData,[key]:e.target.value})}/>
            :<input value={editData[key]||''} onChange={e=>setEditData({...editData,[key]:e.target.value})}/>}</div>);
        })}
        <Btn variant="primary" size="md" onClick={saveAgent}>Save to Registry</Btn>
      </div>)}
      {editing&&editTarget==='memory'&&(<div className="space-y-3">
        <label className="text-[10px] text-dim uppercase">Full JD Content</label>
        <textarea rows={15} value={editData.content||''} onChange={e=>setEditData({...editData,content:e.target.value})}/>
        <Btn variant="primary" size="md" onClick={saveAgent}>Save to Brain</Btn>
      </div>)}
    </Modal>
  </div>);
}
