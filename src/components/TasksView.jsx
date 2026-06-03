import { useState, useEffect } from 'react';
import { BookOpen, Plus, ExternalLink, RefreshCw, X, Eye } from 'lucide-react';

export default function TasksView({ token, user }) {
  const [tasks, setTasks] = useState([]);
  const [interns, setInterns] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal configs
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskAssignee, setTaskAssignee] = useState('');

  // Push code submission configs
  const [activeTaskForSubmit, setActiveTaskForSubmit] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');

  // Audit configs
  const [activeReviewSub, setActiveReviewSub] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  const fetchTasksData = async () => {
    try {
      const pTasks = fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
      const pInterns = (user.role === 'Admin' || user.role === 'Mentor') 
        ? fetch('/api/interns', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
        : Promise.resolve([]);
      const pSubs = fetch('/api/submissions', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());

      const [resTasks, resInterns, resSubs] = await Promise.all([pTasks, pInterns, pSubs]);
      setTasks(resTasks || []);
      setInterns(resInterns || []);
      setSubmissions(resSubs || []);
    } catch (e) {
      console.error('Error fetching tasks components', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksData();
  }, [token]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle || !taskDeadline || !taskAssignee) {
      alert('Fill all required fields');
      return;
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          deadline: taskDeadline,
          priority: taskPriority,
          assigneeId: taskAssignee,
        }),
      });

      if (res.ok) {
        setTaskTitle('');
        setTaskDesc('');
        setTaskDeadline('');
        setTaskAssignee('');
        setShowTaskForm(false);
        fetchTasksData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to dispatch task');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleSubmitTaskSolution = async (e) => {
    e.preventDefault();
    if (!githubUrl || !activeTaskForSubmit) return;

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskId: activeTaskForSubmit.id,
          githubUrl,
          notes: submissionNotes,
        }),
      });

      if (res.ok) {
        setGithubUrl('');
        setSubmissionNotes('');
        setActiveTaskForSubmit(null);
        fetchTasksData();
        alert('Solution pushed successfully! Mentor has been notified for code review.');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to push solution');
      }
    } catch {
      alert('Network transmission failed');
    }
  };

  const handleReviewSubmission = async (status) => {
    if (!activeReviewSub) return;
    try {
      const res = await fetch(`/api/submissions/${activeReviewSub.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          feedback: feedbackText,
        }),
      });

      if (res.ok) {
        setFeedbackText('');
        setActiveReviewSub(null);
        fetchTasksData();
      } else {
        const d = await res.json();
        alert(d.error || 'Review submission failed');
      }
    } catch {
      alert('Network failed');
    }
  };

  const handleTransitionTask = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Pending' ? 'In Progress' : 'Completed';
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchTasksData();
      }
    } catch {
      alert('Update failed');
    }
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Permanently remove this task from pipeline?')) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTasksData();
      }
    } catch {
      alert('Network request failed');
    }
  };

  const getPriorityBadgeColor = (p) => {
    switch (p) {
      case 'High': return 'bg-red-50 text-red-700 border-red-105';
      case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-105';
      default: return 'bg-slate-50 text-slate-700 border-slate-105';
    }
  };

  const renderColumn = (colStatus, bgCol, headerText) => {
    const list = tasks.filter((t) => t.status === colStatus);
    return (
      <div className={`p-4 ${bgCol} rounded-2xl flex flex-col h-full min-h-[480px]`}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              colStatus === 'Completed' ? 'bg-emerald-500' : colStatus === 'In Progress' ? 'bg-amber-500' : 'bg-red-400'
            }`}></span>
            {headerText}
          </span>
          <span className="font-mono text-xs font-bold text-slate-500 px-2 py-0.5 bg-white rounded-full">{list.length}</span>
        </div>

        <div className="flex-1 space-y-3.5 overflow-y-auto">
          {list.length === 0 ? (
            <div className="py-12 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
              No tasks here
            </div>
          ) : (
            list.map((task) => {
              const taskSub = submissions.find((s) => s.taskId === task.id);
              return (
                <div key={task.id} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow transition relative flex flex-col justify-between min-h-[140px]">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase ${getPriorityBadgeColor(task.priority)}`}>
                        {task.priority} Priority
                      </span>
                      {user.role !== 'Intern' && (
                        <button
                          id={`task-delete-btn-${task.id}`}
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h4 id={`task-title-${task.id}`} className="text-xs font-bold text-slate-800 tracking-tight mt-2">{task.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-450">
                      <span className="font-bold uppercase tracking-wide text-slate-400">Assignee:</span>
                      <span className="font-semibold text-slate-700 max-w-[124px] truncate">{task.assigneeName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-450">
                      <span className="font-bold uppercase tracking-wide text-slate-400">Deadline:</span>
                      <span className="font-mono text-[9px] font-semibold text-slate-600">{task.deadline}</span>
                    </div>

                    <div className="pt-1 flex gap-1.5">
                      {taskSub ? (
                        <div className="w-full flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                            taskSub.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-800'
                              : taskSub.status === 'Changes Requested'
                              ? 'bg-red-50 text-red-800'
                              : 'bg-amber-50 text-amber-800'
                          }`}>
                            {taskSub.status}
                          </span>
                          {user.role !== 'Intern' && taskSub.status === 'In Review' && (
                            <button
                              id={`task-review-btn-${task.id}`}
                              onClick={() => {
                                setActiveReviewSub(taskSub);
                                setFeedbackText(taskSub.feedback || '');
                              }}
                              className="font-bold text-[9px] text-indigo-600 hover:underline flex items-center gap-0.5"
                            >
                              <Eye className="w-3 px-0.5" /> Audit Code
                            </button>
                          )}
                          {taskSub.githubUrl && (
                            <a
                              id={`task-github-link-${task.id}`}
                              href={taskSub.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-700"
                            >
                              <ExternalLink className="w-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <>
                          {user.role === 'Intern' && colStatus !== 'Completed' && (
                            <button
                              id={`task-submit-btn-${task.id}`}
                              onClick={() => setActiveTaskForSubmit(task)}
                              className="w-full py-1 bg-indigo-50 border border-indigo-100 rounded text-[9px] text-indigo-700 font-bold hover:bg-indigo-100"
                            >
                              Push Solution
                            </button>
                          )}
                        </>
                      )}

                      {colStatus !== 'Completed' && (user.role === 'Admin' || user.role === 'Mentor' || (user.role === 'Intern' && colStatus === 'Pending')) && !taskSub && (
                        <button
                          id={`task-transition-btn-${task.id}`}
                          onClick={() => handleTransitionTask(task.id, colStatus)}
                          className="flex items-center justify-center w-full py-1 bg-slate-50 border border-slate-200 rounded text-[9px] text-slate-700 font-bold hover:bg-slate-100"
                        >
                          {colStatus === 'Pending' ? 'Start Task ➜' : 'Finalize ➜'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-xs">Connecting Kanban pipelines...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header action */}
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-slate-800">Assign & Submissions Kanban Flow</h2>
          <p className="text-[11px] text-slate-400">Track deadlines, submission codes and mentor workflows.</p>
        </div>
        {(user.role === 'Admin' || user.role === 'Mentor') && (
          <button
            id="task-create-trigger-btn"
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-lg text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Assign Task
          </button>
        )}
      </div>

      {/* Task Creation Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <form
            id="task-create-modal"
            onSubmit={handleCreateTask}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-850">Assign New Board Milestone</h3>
              <button type="button" onClick={() => setShowTaskForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Task Title</label>
                <input
                  id="task-title-input"
                  type="text"
                  required
                  placeholder="e.g. Build SQLite Connector Module"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Detailed Description</label>
                <textarea
                  id="task-desc-input"
                  placeholder="Outline submission parameters, endpoints etc..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Priority</label>
                  <select
                    id="task-priority-select"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Deadline</label>
                  <input
                    id="task-deadline-input"
                    type="date"
                    required
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Select assignee intern</label>
                <select
                  id="task-assignee-select"
                  required
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
                >
                  <option value="">Choose...</option>
                  {interns.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.domain})</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              id="task-submit-btn"
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs active:scale-[99]"
            >
              Confirm Board Assignment
            </button>
          </form>
        </div>
      )}

      {/* Intern Solution Submission */}
      {activeTaskForSubmit && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <form
            id="task-submit-solution-form"
            onSubmit={handleSubmitTaskSolution}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 truncate max-w-xs">{activeTaskForSubmit.title} Solution</h3>
              <button type="button" onClick={() => setActiveTaskForSubmit(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">GitHub Repository Link</label>
                <input
                  id="submit-github-url"
                  type="url"
                  required
                  placeholder="https://github.com/myaccount/myproject"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Submission Notes</label>
                <textarea
                  id="submit-notes"
                  placeholder="Include highlights, instructions or comments for structural verification..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              id="solution-push-btn"
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
            >
              Certify & Request Review Audit
            </button>
          </form>
        </div>
      )}

      {/* Mentor Audit Review */}
      {activeReviewSub && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Review Code Deliverable</h3>
              <button type="button" onClick={() => setActiveReviewSub(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                <div><span className="font-bold text-slate-700">Intern:</span> {activeReviewSub.internName}</div>
                <div><span className="font-bold text-slate-700">Target Task:</span> {activeReviewSub.taskTitle}</div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-700">Repository:</span>
                  <a href={activeReviewSub.githubUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5 truncate max-w-[200px]">
                    {activeReviewSub.githubUrl}
                  </a>
                </div>
                {activeReviewSub.notes && (
                  <div className="pt-2 border-t border-slate-200 mt-1.5">
                    <span className="font-bold text-[10px] uppercase tracking-wide text-slate-400 block">Notes:</span>
                    <p className="text-slate-605 italic mt-0.5">"{activeReviewSub.notes}"</p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Review Feedback / Suggestions</label>
                <textarea
                  id="review-feedback"
                  placeholder="Great task execution... Or identify code styling lines to adjust."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <button
                id="review-request-changes-btn"
                onClick={() => handleReviewSubmission('Changes Requested')}
                className="w-full py-2 border border-red-300 rounded-lg text-xs text-red-700 font-bold hover:bg-rose-50"
              >
                Request Changes
              </button>
              <button
                id="review-approve-btn"
                onClick={() => handleReviewSubmission('Approved')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs text-white font-bold"
              >
                Approve Solution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Tri-columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderColumn('Pending', 'bg-slate-50', 'Backlog / Pending')}
        {renderColumn('In Progress', 'bg-amber-50/40', 'In Progress Track')}
        {renderColumn('Completed', 'bg-emerald-50/40', 'Completed Track')}
      </div>
    </div>
  );
}
