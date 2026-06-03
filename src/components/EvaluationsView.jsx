import { useState, useEffect } from 'react';
import { Award, Star, Sparkles, MessageSquare, Loader, CheckCircle } from 'lucide-react';

export default function EvaluationsView({ token, user }) {
  const [evaluations, setEvaluations] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Evaluation entry form
  const [selectedInternId, setSelectedInternId] = useState('');
  const [comm, setComm] = useState(4);
  const [taskComp, setTaskComp] = useState(4);
  const [techSk, setTechSk] = useState(4);
  const [atten, setAtten] = useState(4);
  const [teamCo, setTeamCo] = useState(4);
  const [overallComments, setOverallComments] = useState('');
  
  // AI summary states
  const [aiReport, setAiReport] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // View Details
  const [selectedEval, setSelectedEval] = useState(null);

  const fetchEvalData = async () => {
    try {
      const pEvals = fetch('/api/evaluations', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
      const pInterns = (user.role === 'Admin' || user.role === 'Mentor')
        ? fetch('/api/interns', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
        : Promise.resolve([]);

      const [resEvals, resInterns] = await Promise.all([pEvals, pInterns]);
      setEvaluations(resEvals || []);
      setInterns(resInterns || []);
      
      if (resEvals.length > 0) {
        setSelectedEval(resEvals[resEvals.length - 1]);
      }
    } catch (e) {
      console.error('Error fetching evaluations', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvalData();
  }, [token]);

  const handleFetchAiAnalysis = async () => {
    if (!selectedInternId) {
      alert('Select an intern first to generate AI Performance Analysis.');
      return;
    }
    setAnalyzing(true);
    setAiReport('');
    try {
      const res = await fetch('/api/evaluations/gemini-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          internId: selectedInternId,
          ratings: {
            communication: comm,
            taskCompletion: taskComp,
            technicalSkills: techSk,
            attendance: atten,
            teamCollaboration: teamCo,
          },
          comments: overallComments,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAiReport(data.analysis);
      } else {
        alert(data.error || 'AI generation failed');
      }
    } catch {
      alert('Network transmission failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    if (!selectedInternId) {
      alert('Must select a valid intern');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          internId: selectedInternId,
          ratings: {
            communication: comm,
            taskCompletion: taskComp,
            technicalSkills: techSk,
            attendance: atten,
            teamCollaboration: teamCo,
          },
          overallComments,
        }),
      });
      const data = await res.json();
      
      // Save AI analysis summary inside comments / storage if generated
      if (res.ok) {
        // If we generated an AI review, append it to the evaluation
        setOverallComments('');
        setAiReport('');
        setSelectedInternId('');
        fetchEvalData();
        alert('Evaluation successfully saved of record!');
      } else {
        alert(data.error || 'Failed to save evaluation record');
      }
    } catch {
      alert('Internal error saving evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (score) => {
    return (
      <div className="flex gap-0.5 text-amber-500">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= score ? 'fill-current' : 'text-slate-200'}`} />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500">
        <Loader className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-xs">Gathering performance diagnostics...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List evaluations / Form */}
      <div className="lg:col-span-2 space-y-6">
        {(user.role === 'Admin' || user.role === 'Mentor') && (
          <form
            id="evaluations-entry-form"
            onSubmit={handleSaveEvaluation}
            className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4"
          >
            <div className="space-y-0.5 pb-2 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Add Professional Evaluation & Review</h3>
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600">KPI Scorecard</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Select Intern To Evaluate</label>
                <select
                  id="eval-candidate-select"
                  required
                  value={selectedInternId}
                  onChange={(e) => setSelectedInternId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
                >
                  <option value="">Select Candidate...</option>
                  {interns.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.domain})</option>
                  ))}
                </select>
              </div>

              {/* Sliders KPI ratings */}
              <div className="p-4 bg-slate-50 rounded-xl space-y-3.5 border border-slate-150">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-450 block">Track ratings criteria (1-5 point scale)</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200/50">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Technical Skills</span>
                      <span className="font-mono font-bold text-indigo-600">{techSk}/5</span>
                    </div>
                    <input type="range" min="1" max="5" value={techSk} onChange={(e) => setTechSk(Number(e.target.value))} className="w-full" />
                  </div>

                  <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200/50">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Task Completion</span>
                      <span className="font-mono font-bold text-indigo-600">{taskComp}/5</span>
                    </div>
                    <input type="range" min="1" max="5" value={taskComp} onChange={(e) => setTaskComp(Number(e.target.value))} className="w-full" />
                  </div>

                  <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200/50">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Communication</span>
                      <span className="font-mono font-bold text-indigo-600">{comm}/5</span>
                    </div>
                    <input type="range" min="1" max="5" value={comm} onChange={(e) => setComm(Number(e.target.value))} className="w-full" />
                  </div>

                  <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200/50">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Attendance & Log</span>
                      <span className="font-mono font-bold text-indigo-600">{atten}/5</span>
                    </div>
                    <input type="range" min="1" max="5" value={atten} onChange={(e) => setAtten(Number(e.target.value))} className="w-full" />
                  </div>

                  <div className="space-y-1 sm:col-span-2 bg-white p-3 rounded-lg border border-slate-200/50">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Team Collaboration</span>
                      <span className="font-mono font-bold text-indigo-600">{teamCo}/5</span>
                    </div>
                    <input type="range" min="1" max="5" value={teamCo} onChange={(e) => setTeamCo(Number(e.target.value))} className="w-full" />
                  </div>
                </div>
              </div>

              {/* Commentary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 inline-block">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Mentor Review Commentary</label>
                  <textarea
                    id="eval-comments-textarea"
                    placeholder="Provide subjective descriptions..."
                    value={overallComments}
                    onChange={(e) => setOverallComments(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-750 flex items-center gap-1">
                      <Sparkles className="w-3" /> Gemini Evaluation
                    </span>
                    <p className="text-[10px] text-indigo-600 leading-relaxed">
                      Leverage Gemini models to generate professional summaries and career growth action points.
                    </p>
                  </div>
                  <button
                    id="eval-gemini-analysis-btn"
                    type="button"
                    onClick={handleFetchAiAnalysis}
                    disabled={analyzing || !selectedInternId}
                    className="w-full mt-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold rounded-lg disabled:opacity-50 tracking-tighter"
                  >
                    {analyzing ? 'Drafting Report...' : 'Compile Generative Report'}
                  </button>
                </div>
              </div>

              {/* Render AI Result Summary inline */}
              {aiReport && (
                <div className="p-4 bg-slate-900 text-slate-200 border border-slate-800 rounded-xl space-y-2 mt-2">
                  <span className="text-[9px] uppercase tracking-widest font-extrabold text-indigo-400 block flex items-center gap-1">
                    <Sparkles className="w-3 text-indigo-450 animate-pulse" /> Gemini Draft Model Response
                  </span>
                  <div className="text-xs space-y-1 overflow-y-auto max-h-56 leading-relaxed font-mono whitespace-pre-line text-slate-300">
                    {aiReport}
                  </div>
                </div>
              )}
            </div>

            <button
              id="eval-save-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-indigo-600 hover:bg-slate-90 hover:from-slate-90 text-white font-bold rounded-lg text-xs"
            >
              {submitting ? 'Storing score records...' : 'Confirm Scorecard Entry'}
            </button>
          </form>
        )}

        {/* Existing Evaluations list */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Historical Evaluation Reports Log</h3>
          {evaluations.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No historical records registered on directory yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evaluations.map((e) => {
                const totalScore = (e.ratings.communication + e.ratings.taskCompletion + e.ratings.technicalSkills + e.ratings.attendance + e.ratings.teamCollaboration) / 5;
                return (
                  <div
                    key={e.id}
                    onClick={() => setSelectedEval(e)}
                    className={`p-3.5 bg-slate-50 border rounded-xl hover:border-indigo-400 cursor-pointer transition flex flex-col justify-between ${
                      selectedEval?.id === e.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-150'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[150px] uppercase tracking-tight">{e.internName}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">{e.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(Math.round(totalScore))}
                        <span className="text-[10px] font-bold text-indigo-600 mt-0.5">{totalScore.toFixed(1)}/5.0</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-3 line-clamp-2 italic">"{e.overallComments || 'No verbal details.'}"</p>
                    </div>

                    <span className="text-[9px] text-right text-slate-400 block mt-2">Evaluated by: {e.mentorName}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail side panel */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm h-fit space-y-4">
        {selectedEval ? (
          <>
            <div className="text-center pb-3 border-b border-slate-100">
              <Award className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
              <h3 className="text-xs uppercase tracking-tight font-extrabold text-slate-500">Evaluation Detailed Report</h3>
              <h4 id="detail-eval-intern" className="text-sm font-bold text-slate-800 mt-1">{selectedEval.internName}</h4>
              <span className="text-[10px] text-slate-400 font-mono">Date: {selectedEval.date}</span>
            </div>

            {/* Render Criteria ratings */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] uppercase font-mono font-extrabold text-slate-400 block tracking-wider">Criteria breakdown</span>
              
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-150">
                <div className="flex justify-between items-center">
                  <span className="text-slate-650 font-normal">Technical Skills:</span>
                  <span className="font-mono font-bold text-slate-850 flex items-center gap-1.5">{selectedEval.ratings.technicalSkills} {renderStars(selectedEval.ratings.technicalSkills)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-650 font-normal">Task Completion:</span>
                  <span className="font-mono font-bold text-slate-850 flex items-center gap-1.5">{selectedEval.ratings.taskCompletion} {renderStars(selectedEval.ratings.taskCompletion)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-650 font-normal">Communication:</span>
                  <span className="font-mono font-bold text-slate-850 flex items-center gap-1.5">{selectedEval.ratings.communication} {renderStars(selectedEval.ratings.communication)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-650 font-normal">Attendance Entry:</span>
                  <span className="font-mono font-bold text-slate-850 flex items-center gap-1.5">{selectedEval.ratings.attendance} {renderStars(selectedEval.ratings.attendance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-650 font-normal">Team Collaboration:</span>
                  <span className="font-mono font-bold text-slate-850 flex items-center gap-1.5">{selectedEval.ratings.teamCollaboration} {renderStars(selectedEval.ratings.teamCollaboration)}</span>
                </div>
              </div>
            </div>

            {/* Commentary block */}
            <div className="space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Mentor Overall Feedback</span>
              <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-lg text-slate-700 italic leading-relaxed">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400 float-left mr-1.5 mt-0.5" />
                "{selectedEval.overallComments || 'No commentary entered.'}"
              </div>
            </div>

            {selectedEval.perfSummary && (
              <div className="p-3 bg-slate-900 border border-slate-850 text-slate-250 rounded-xl text-xs space-y-1">
                <span className="text-[9px] uppercase tracking-widest text-indigo-400 block font-bold">Metadata Sync Summary</span>
                <p className="font-sans leading-relaxed text-slate-350">{selectedEval.perfSummary}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Award className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-xs font-normal">Select an evaluation card log to inspect breakdown ratings and mentor feedback reviews.</p>
          </div>
        )}
      </div>
    </div>
  );
}
