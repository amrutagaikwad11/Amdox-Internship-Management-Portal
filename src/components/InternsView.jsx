import { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Upload, Trash2, Mail, Award, BookOpen, GraduationCap, X } from 'lucide-react';

export default function InternsView({ token, user }) {
  const [interns, setInterns] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('All');
  
  // Onboard form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [skills, setSkills] = useState('');
  const [domain, setDomain] = useState('Frontend Engineering');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // File uploading states (base64)
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [resumeBase64, setResumeBase64] = useState('');
  const [resumeName, setResumeName] = useState('');

  // Selection configurations
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [allocating, setAllocating] = useState(false);

  const fetchInterns = async () => {
    try {
      const res = await fetch('/api/interns', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setInterns(data || []);
    } catch (e) {
      console.error('Error fetching interns', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMentors = async () => {
    try {
      const res = await fetch('/api/mentors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMentors(data || []);
    } catch (e) {
      console.error('Error fetching mentors', e);
    }
  };

  useEffect(() => {
    fetchInterns();
    if (user.role === 'Admin') {
      fetchMentors();
    }
  }, [token]);

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result;
      const base64Data = resultStr.split(',')[1];
      if (type === 'photo') {
        setPhotoBase64(base64Data);
        setPhotoName(file.name);
      } else {
        setResumeBase64(base64Data);
        setResumeName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadFile = async (base64, filename) => {
    if (!base64) return '';
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: filename, base64 }),
      });
      const data = await res.json();
      return data.url || '';
    } catch {
      return '';
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email) {
      alert('Name and Email are required');
      return;
    }

    setSubmitting(true);
    try {
      const uploadedPhotoUrl = photoBase64 ? await uploadFile(photoBase64, photoName) : '';
      const uploadedResumeUrl = resumeBase64 ? await uploadFile(resumeBase64, resumeName) : '';

      const res = await fetch('/api/interns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          email,
          college,
          skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
          domain,
          joiningDate,
        }),
      });

      const registeredIntern = await res.json();

      if (res.ok) {
        if (uploadedPhotoUrl || uploadedResumeUrl) {
          await fetch(`/api/interns/${registeredIntern.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              profilePhoto: uploadedPhotoUrl || undefined,
              resumeUrl: uploadedResumeUrl || undefined,
            }),
          });
        }

        setName('');
        setEmail('');
        setCollege('');
        setSkills('');
        setPhotoBase64('');
        setPhotoName('');
        setResumeBase64('');
        setResumeName('');
        setShowForm(false);
        fetchInterns();
      } else {
        alert(registeredIntern.error || 'Onboarding error');
      }
    } catch (error) {
      alert('Internal onboarding request failure');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIntern = async (id) => {
    if (!confirm('Purging this intern will permanently wipe all core attendance, evaluations and certificate links. Continue?')) {
      return;
    }

    try {
      const res = await fetch(`/api/interns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSelectedIntern(null);
        fetchInterns();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to remove intern');
      }
    } catch {
      alert('Network transmission failed');
    }
  };

  const handleChangeAllocation = async () => {
    if (!selectedIntern || !selectedMentorId) {
      alert('Select a valid mentor');
      return;
    }

    setAllocating(true);
    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          internId: selectedIntern.id,
          mentorId: selectedMentorId,
        }),
      });
      if (res.ok) {
        const selectedM = mentors.find((m) => m.id === selectedMentorId);
        if (selectedM) {
          setSelectedIntern({
            ...selectedIntern,
            mentorId: selectedM.id,
            mentorName: selectedM.name,
          });
        }
        fetchInterns();
        alert('Allocation successfully adjusted!');
      } else {
        const d = await res.json();
        alert(d.error || 'Allocation adjustment failed');
      }
    } catch {
      alert('Network transmission failed');
    } finally {
      setAllocating(false);
    }
  };

  const domainsList = ['All', 'Frontend Engineering', 'Full-Stack Engineering', 'Data Science', 'DevOps & Systems'];
  const filteredInterns = interns.filter((i) => {
    const query = search.toLowerCase().trim();
    const matchSearch =
      i.name.toLowerCase().includes(query) ||
      i.email.toLowerCase().includes(query) ||
      i.college.toLowerCase().includes(query) ||
      i.skills.some((s) => s.toLowerCase().includes(query));

    const matchDomain = domainFilter === 'All' || i.domain === domainFilter;
    return matchSearch && matchDomain;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List Panel */}
      <div className="lg:col-span-2 space-y-4">
        {/* Top search panel */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-2.5 w-4 text-slate-400" />
            <input
              id="interns-search-input"
              type="text"
              placeholder="Search interns by name, college, skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-normal">Domain:</span>
            <select
              id="interns-domain-filter"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="border border-slate-200 rounded-lg py-1.5 px-3 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-normal"
            >
              {domainsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          {user.role === 'Admin' && (
            <button
              id="onboard-trigger-btn"
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 rounded-lg text-xs text-white font-medium hover:bg-indigo-700 transition"
            >
              <UserPlus className="w-3.5 h-3.5" /> Onboard Intern
            </button>
          )}
        </div>

        {/* Register Onboarding Form */}
        {showForm && (
          <form
            id="interns-onboard-form"
            onSubmit={handleRegister}
            className="p-5 bg-slate-50 rounded-xl border border-slate-200 shadow-inner space-y-4"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-150">
              <h3 className="text-sm font-bold text-slate-800">New Student Registration</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-650">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Name</label>
                <input
                  id="onboard-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alice Cooper"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Email</label>
                <input
                  id="onboard-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alice@domain.com"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">College / Institution</label>
                <input
                  id="onboard-college"
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="Boston University"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Skills (Comma-separated)</label>
                <input
                  id="onboard-skills"
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Python, Java, Pandas"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Track Specialty Domain</label>
                <select
                  id="onboard-domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Frontend Engineering">Frontend Engineering</option>
                  <option value="Full-Stack Engineering">Full-Stack Engineering</option>
                  <option value="Data Science">Data Science</option>
                  <option value="DevOps & Systems">DevOps & Systems</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Joining Date</label>
                <input
                  id="onboard-joining"
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Resume / Profile uploading base64 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
              <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Profile Photo</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 cursor-pointer rounded text-[11px] font-medium text-slate-700">
                    <Upload className="w-3" /> Select Image
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'photo')} />
                  </label>
                  <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{photoName || 'DefaultAvatar.png'}</span>
                </div>
              </div>
              <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Student CV / Resume</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 cursor-pointer rounded text-[11px] font-medium text-slate-700">
                    <Upload className="w-3" /> Select Doc
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => handleFileChange(e, 'resume')} />
                  </label>
                  <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{resumeName || 'DefaultResume.pdf'}</span>
                </div>
              </div>
            </div>

            <button
              id="onboard-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-indigo-600 rounded-lg text-white font-medium text-xs hover:bg-indigo-700 active:scale-[99] active:duration-100 disabled:opacity-50"
            >
              {submitting ? 'Registering Intern Credentials...' : 'Confirm Registration & Auto-Assign Mentor'}
            </button>
          </form>
        )}

        {/* Intern list cards */}
        {filteredInterns.length === 0 ? (
          <div className="p-10 bg-white border border-slate-200 rounded-2xl text-center text-slate-400">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-normal">No interns matched your query metrics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInterns.map((i) => (
              <div
                key={i.id}
                onClick={() => setSelectedIntern(i)}
                className={`p-4 bg-white border rounded-2xl shadow-sm cursor-pointer hover:border-indigo-400 hover:shadow duration-150 relative overflow-hidden flex flex-col justify-between h-44 ${
                  selectedIntern?.id === i.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start gap-3">
                    <img
                      src={i.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                      alt={i.name}
                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'; }}
                      className="w-10 h-10 object-cover rounded-full border border-slate-100"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs uppercase font-bold text-slate-800 tracking-tight truncate">{i.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{i.college}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 font-medium rounded-full text-[10px]">
                        {i.domain}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {i.skills?.slice(0, 3).map((skill, sIdx) => (
                      <span key={sIdx} className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[9px] text-slate-500 font-medium">
                        {skill}
                      </span>
                    ))}
                    {i.skills?.length > 3 && (
                      <span className="text-[9px] text-slate-450 font-semibold inline-block align-middle pb-1">+{i.skills.length - 3}</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">
                    Mentor: <strong className="text-slate-600">{i.mentorName}</strong>
                  </span>
                  <div className="flex items-center gap-1 font-semibold text-emerald-600">
                    <span>Attendance:</span>
                    <span>{i.attendanceRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail side panel */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm h-fit space-y-5">
        {selectedIntern ? (
          <>
            <div className="text-center space-y-2 pb-4 border-b border-slate-100">
              <img
                src={selectedIntern.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={selectedIntern.name}
                className="w-16 h-16 object-cover rounded-full border-2 border-indigo-100 mx-auto"
              />
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{selectedIntern.name}</h3>
                <p className="text-xs text-slate-400 font-normal">{selectedIntern.email}</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <GraduationCap className="w-4 h-4 text-indigo-500 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">College</span>
                  <p className="font-semibold text-slate-700">{selectedIntern.college}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Award className="w-4 h-4 text-violet-500 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">Track Domain</span>
                  <p className="font-semibold text-slate-700">{selectedIntern.domain}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-emerald-500 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold font-mono">Joining Date</span>
                  <p className="font-semibold text-slate-700">{selectedIntern.joiningDate}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-500 mt-0.5" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-bold">Skills Registered</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedIntern.skills?.map((skill, sIdx) => (
                      <span key={sIdx} className="px-2 py-0.5 bg-slate-50 border border-slate-200/55 rounded-lg text-[10px] font-medium text-slate-600">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {selectedIntern.resumeUrl && (
                <div className="pt-2">
                  <a
                    id="interns-view-resume-link"
                    href={selectedIntern.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg text-slate-700 font-bold tracking-tight text-xs duration-100"
                  >
                    View Registered Student Resume
                  </a>
                </div>
              )}
            </div>

            {user.role === 'Admin' && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Re-allocate Mentor</span>
                <div className="flex gap-2">
                  <select
                    id="interns-reallocate-select"
                    value={selectedMentorId}
                    onChange={(e) => setSelectedMentorId(e.target.value)}
                    className="flex-1 py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">Choose Mentor...</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <button
                    id="interns-reallocate-btn"
                    onClick={handleChangeAllocation}
                    disabled={allocating || !selectedMentorId}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                  >
                    Set
                  </button>
                </div>
              </div>
            )}

            {user.role === 'Admin' && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  id="interns-delete-btn"
                  onClick={() => handleDeleteIntern(selectedIntern.id)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold border border-rose-100 duration-100"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Purge Intern Account
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10 text-slate-400">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-xs font-normal">Select an intern to view detailed profiles, resume attachments, or customize allocation settings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
