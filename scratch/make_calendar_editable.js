const fs = require('fs');

const file = 'apps/web/src/app/departments/social-media/dashboard/admin/calendar/page.tsx';
let raw = fs.readFileSync(file, 'utf8');
const isCRLF = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// 1. Add Edit Task & Edit Category States
const stateTarget = `  // Single Task Creation Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<MediaCalendarTask['type']>('video_create');
  const [newTaskRole, setNewTaskRole] = useState<'editor' | 'designer' | 'all'>('editor');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [addingTask, setAddingTask] = useState(false);`;

const stateReplacement = `  // Single Task Creation Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<MediaCalendarTask['type']>('video_create');
  const [newTaskRole, setNewTaskRole] = useState<'editor' | 'designer' | 'all'>('editor');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // Edit Task State
  const [editingTask, setEditingTask] = useState<MediaCalendarTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskType, setEditTaskType] = useState<MediaCalendarTask['type']>('custom');
  const [editTaskRole, setEditTaskRole] = useState<'editor' | 'designer' | 'all'>('editor');
  const [editStaffId, setEditStaffId] = useState<string>('');
  const [editTaskNote, setEditTaskNote] = useState('');
  const [editTaskCompleted, setEditTaskCompleted] = useState(false);
  const [updatingTask, setUpdatingTask] = useState(false);

  // Edit Category Row State
  const [editingCategory, setEditingCategory] = useState<MediaContentCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryRole, setEditCategoryRole] = useState<'editor' | 'designer' | 'all'>('all');
  const [updatingCategory, setUpdatingCategory] = useState(false);`;

if (!code.includes(stateTarget)) {
  console.error('State target not found');
  process.exit(1);
}
code = code.replace(stateTarget, stateReplacement);

// 2. Add Handlers for Editing Task & Editing Category
const handlerTarget = `  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this planned task?')) return;
    try {
      await deleteDoc(doc(db, 'media_calendar_tasks', taskId));
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task removed');
    } catch (err: any) {
      toast.error('Failed to delete task');
    }
  };`;

const handlerReplacement = `  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this planned task?')) return;
    try {
      await deleteDoc(doc(db, 'media_calendar_tasks', taskId));
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task removed');
    } catch (err: any) {
      toast.error('Failed to delete task');
    }
  };

  const handleOpenEditTask = (task: MediaCalendarTask) => {
    setEditingTask(task);
    setEditTaskTitle(task.title || '');
    setEditTaskDate(task.date || selectedDate);
    setEditTaskType(task.type || 'custom');
    setEditTaskRole(task.assignedRole || 'editor');
    setEditStaffId(task.assignedStaffId || '');
    setEditTaskNote(task.note || '');
    setEditTaskCompleted(!!task.isCompleted);
  };

  const handleSaveEditTask = async () => {
    if (!editingTask) return;
    const title = editTaskTitle.trim();
    if (!title) {
      toast.error('Task title cannot be empty');
      return;
    }
    const date = editTaskDate || editingTask.date;
    const assignedStaff = staffList.find((s) => s.id === editStaffId);

    try {
      setUpdatingTask(true);
      const updateData: Record<string, any> = {
        title,
        date,
        type: editTaskType,
        assignedRole: editTaskRole,
        isCompleted: editTaskCompleted,
        note: editTaskNote.trim() || '',
        updatedAt: new Date().toISOString(),
      };

      if (assignedStaff) {
        updateData.assignedStaffId = assignedStaff.id;
        updateData.assignedStaffName = assignedStaff.name;
      } else {
        updateData.assignedStaffId = '';
        updateData.assignedStaffName = '';
      }

      if (editTaskCompleted && !editingTask.isCompleted) {
        updateData.completedAt = new Date().toISOString();
        updateData.completedBy = (user as any)?.displayName || (user as any)?.name || 'Admin';
      } else if (!editTaskCompleted) {
        updateData.completedAt = null;
        updateData.completedBy = null;
      }

      await updateDoc(doc(db, 'media_calendar_tasks', editingTask.id), updateData);

      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...updateData } : t))
      );

      toast.success('Task updated successfully ✓');
      setEditingTask(null);
    } catch (err: any) {
      console.error('Failed to update task:', err);
      toast.error('Failed to update task: ' + err.message);
    } finally {
      setUpdatingTask(false);
    }
  };

  const handleOpenEditCategory = (cat: MediaContentCategory) => {
    setEditingCategory(cat);
    setEditCategoryName(cat.name);
    setEditCategoryRole(cat.defaultRole || 'all');
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategory) return;
    const name = editCategoryName.trim();
    if (!name) {
      toast.error('Task row name cannot be empty');
      return;
    }
    try {
      setUpdatingCategory(true);
      const updateData = {
        name,
        defaultRole: editCategoryRole,
      };
      await updateDoc(doc(db, 'media_content_categories', editingCategory.id), updateData);
      setCategories((prev) =>
        prev.map((c) => (c.id === editingCategory.id ? { ...c, ...updateData } : c))
      );
      toast.success('Task row updated successfully');
      setEditingCategory(null);
    } catch (err: any) {
      toast.error('Failed to update category: ' + err.message);
    } finally {
      setUpdatingCategory(false);
    }
  };`;

if (!code.includes(handlerTarget)) {
  console.error('Handler target not found');
  process.exit(1);
}
code = code.replace(handlerTarget, handlerReplacement);

// 3. In Matrix view: Add Edit button next to Delete Row button
const matrixActionsTarget = `                        {/* Actions (Delete Row) */}
                        <td className="px-2 py-2 text-center border-gray-200 print:hidden">
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>`;

const matrixActionsReplacement = `                        {/* Actions (Edit & Delete Row) */}
                        <td className="px-2 py-2 text-center border-gray-200 print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Task Row"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>`;

if (!code.includes(matrixActionsTarget)) {
  console.error('matrixActionsTarget not found');
  process.exit(1);
}
code = code.replace(matrixActionsTarget, matrixActionsReplacement);

// 4. In Daily Scheduled Tasks List: Add Edit button next to Delete Task button
const taskItemTarget = `                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Delete Task"
                      >
                        <Trash2 size={16} />
                      </button>`;

const taskItemReplacement = `                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTask(t)}
                          className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Task Details"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>`;

if (!code.includes(taskItemTarget)) {
  console.error('taskItemTarget not found');
  process.exit(1);
}
code = code.replace(taskItemTarget, taskItemReplacement);

// 5. In Weekly View: Make task chips clickable to edit
const weeklyChipTarget = `                      dayTasks.map((t) => (
                        <span
                          key={t.id}
                          className={\`px-2.5 py-1 rounded-lg text-[10px] font-bold border \${
                            t.isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }\`}
                        >
                          {t.title} {t.assignedStaffName ? \`(\${t.assignedStaffName})\` : ''}
                        </span>
                      ))`;

const weeklyChipReplacement = `                      dayTasks.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditTask(t);
                          }}
                          className={\`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 hover:shadow-sm hover:scale-105 transition-all cursor-pointer \${
                            t.isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }\`}
                          title="Click to edit task"
                        >
                          <span>{t.title} {t.assignedStaffName ? \`(\${t.assignedStaffName})\` : ''}</span>
                          <Edit3 size={10} className="opacity-60" />
                        </button>
                      ))`;

if (!code.includes(weeklyChipTarget)) {
  console.error('weeklyChipTarget not found');
  process.exit(1);
}
code = code.replace(weeklyChipTarget, weeklyChipReplacement);

// 6. At bottom of file: Add Edit Task Modal and Edit Category Modal
const modalsTarget = `      {/* Add Custom Category Row Modal */}
      {showAddCategoryModal && (`;

const modalsAddition = `      {/* Edit Scheduled Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Edit3 size={18} className="text-cyan-600" /> Edit Scheduled Task
              </h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="Task title or details..."
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={editTaskDate}
                    onChange={(e) => setEditTaskDate(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Task Type
                  </label>
                  <select
                    value={editTaskType}
                    onChange={(e) => setEditTaskType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="video_create">Create Video</option>
                    <option value="video_upload">Upload Video</option>
                    <option value="graphic_create">Create Graphic Post</option>
                    <option value="graphic_upload">Upload Graphic Post</option>
                    <option value="custom">Custom Task</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={editTaskRole}
                    onChange={(e) => setEditTaskRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="editor">Editor Role</option>
                    <option value="designer">Graphic Designer Role</option>
                    <option value="all">All / Team</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Assign Staff Member
                  </label>
                  <select
                    value={editStaffId}
                    onChange={(e) => setEditStaffId(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="">-- Unassigned / Any --</option>
                    {staffList.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.designation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Task Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTaskCompleted(false)}
                    className={\`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer \${
                      !editTaskCompleted
                        ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-xs'
                        : 'bg-slate-50 border-gray-200 text-slate-400 hover:bg-slate-100'
                    }\`}
                  >
                    <Circle size={14} /> Pending / Incomplete
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTaskCompleted(true)}
                    className={\`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer \${
                      editTaskCompleted
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                        : 'bg-slate-50 border-gray-200 text-slate-400 hover:bg-slate-100'
                    }\`}
                  >
                    <CheckCircle2 size={14} /> Completed ✓
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Note / Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional note or instructions for the assigned staff..."
                  value={editTaskNote}
                  onChange={(e) => setEditTaskNote(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-medium text-gray-800 outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditTask}
                  disabled={updatingTask}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {updatingTask ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Save Task Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Row Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-600" /> Edit Content Task Row
              </h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Task / Channel Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rehab Video, Job Center Graphics, Tiktok Reel..."
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Default Role Assigned
                </label>
                <select
                  value={editCategoryRole}
                  onChange={(e) => setEditCategoryRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 outline-none"
                >
                  <option value="editor">Video Editor</option>
                  <option value="designer">Graphic Designer</option>
                  <option value="all">All Roles / General</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditCategory}
                  disabled={updatingCategory}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {updatingCategory ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                  Update Task Row
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Category Row Modal */}
      {showAddCategoryModal && (`;

if (!code.includes(modalsTarget)) {
  console.error('modalsTarget not found');
  process.exit(1);
}
code = code.replace(modalsTarget, modalsAddition);

if (isCRLF) {
  code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync(file, code, 'utf8');
console.log('Successfully updated calendar/page.tsx with full edit capabilities!');
