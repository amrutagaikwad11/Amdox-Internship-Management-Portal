import { useState, useEffect } from 'react';
import { Award, FileText, CheckCircle, ShieldCheck, Download, Users, Plus, X } from 'lucide-react';

export default function CertificatesView({ token, user }) {
  const [certificates, setCertificates] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedInternId, setSelectedInternId] = useState('');
  const [domain, setDomain] = useState('Frontend Engineering');
  const [duration, setDuration] = useState('3 Months');
  const [mentorName, setMentorName] = useState('Lead Internship Director');
  const [submitting, setSubmitting] = useState(false);

  // Selection configurations
  const [selectedCert, setSelectedCert] = useState(null);

  const fetchCertData = async () => {
    try {
      const pCerts = fetch('/api/certificates', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
      const pInterns = (user.role === 'Admin')
        ? fetch('/api/interns', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json())
        : Promise.resolve([]);

      const [resCerts, resInterns] = await Promise.all([pCerts, pInterns]);
      setCertificates(resCerts || []);
      setInterns(resInterns || []);

      if (resCerts.length > 0) {
        setSelectedCert(resCerts[0]);
      }
    } catch (e) {
      console.error('Error fetching certificates data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertData();
  }, [token]);

  const handleGenerateCertificate = async (e) => {
    e.preventDefault();
    if (!selectedInternId) {
      alert('Must select a valid student first');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          internId: selectedInternId,
          domain,
          duration,
          mentorName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedInternId('');
        fetchCertData();
        alert(`Certificate successfully generated!\nUnique Code: ${data.certificateId}`);
      } else {
        alert(data.error || 'Failed to issue certificate');
      }
    } catch {
      alert('Network transmission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500">
        <Award className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-xs">Connecting verification registry...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List credentials / Form */}
      <div className="lg:col-span-1 space-y-6">
        {user.role === 'Admin' && (
          <form
            id="certificate-issue-form"
            onSubmit={handleGenerateCertificate}
            className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4"
          >
            <div className="space-y-0.5 pb-2 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xs uppercase tracking-tight font-extrabold text-slate-500">Issue New Certificate</h3>
              <Plus className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Select Student Candidate</label>
                <select
                  id="cert-intern-select"
                  required
                  value={selectedInternId}
                  onChange={(e) => setSelectedInternId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-normal focus:outline-none"
                >
                  <option value="">Choose student...</option>
                  {interns.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.domain})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Internship Domain Title</label>
                <select
                  id="cert-domain-select"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="Frontend Engineering">Frontend Engineering</option>
                  <option value="Full-Stack Engineering">Full-Stack Engineering</option>
                  <option value="Data Science">Data Science</option>
                  <option value="DevOps & Systems">DevOps & Systems</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Duration of Tenure</label>
                <input
                  id="cert-duration-input"
                  type="text"
                  required
                  placeholder="e.g. 3 Months (June - September)"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Signatory Representative</label>
                <input
                  id="cert-signatory-input"
                  type="text"
                  required
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <button
              id="cert-generate-btn"
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs duration-100 disabled:opacity-50"
            >
              {submitting ? 'Generating Diploma Credentials...' : 'Issue Certified Credential'}
            </button>
          </form>
        )}

        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Generated Credentials Log</h3>
          {certificates.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No credentials generated yet in security ledger.</p>
          ) : (
            <div className="space-y-2">
              {certificates.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCert(c)}
                  className={`p-3 bg-slate-50 border rounded-xl hover:border-indigo-400 cursor-pointer flex items-center justify-between transition ${
                    selectedCert?.id === c.id ? 'border-indigo-500 ring-1 ring-indigo-400' : 'border-slate-150'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">{c.internName}</h4>
                      <p className="text-[9px] font-mono text-indigo-600 font-bold">{c.certificateId}</p>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400">{c.issueDate}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Diploma view */}
      <div className="lg:col-span-2 space-y-4">
        {selectedCert ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Credential Verification Ledger</span>
                <span className="text-xs font-bold font-mono text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> SECURE LEDGER ID: {selectedCert.certificateId}
                </span>
              </div>
              <button
                id="cert-print-btn"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 active:scale-95 duration-100"
              >
                <Download className="w-3.5 h-3.5" /> Print Diploma PDF
              </button>
            </div>

            {/* Certificate Template Layout */}
            <div id="print-diploma-element" className="relative p-12 bg-white rounded-3xl border-8 border-double border-slate-700 shadow-lg text-center font-serif text-slate-900 overflow-hidden select-none">
              
              {/* Outer decorative borders */}
              <div className="absolute top-2 left-2 right-2 bottom-2 border border-slate-350 pointer-events-none rounded-[1.25rem]"></div>
              
              <div className="space-y-6 relative z-10 max-w-lg mx-auto py-4">
                <div className="flex justify-center flex-col items-center gap-1">
                  <Award className="w-20 h-20 text-indigo-700/80 mx-auto" />
                  <span className="text-xs font-sans tracking-[0.25em] font-black uppercase text-slate-400">Ledger Certified</span>
                </div>

                <div className="space-y-1">
                  <h1 className="text-2xl font-bold font-serif tracking-tight text-slate-800">Certificate of Internship Completion</h1>
                  <p className="text-[11px] font-sans text-slate-500 uppercase tracking-widest">This credential certifies that</p>
                </div>

                <div className="border-b border-slate-300 py-1.5 inline-block mx-auto min-w-[280px]">
                  <span className="font-serif text-2xl tracking-normal italic font-semibold text-indigo-900 select-all block h-9">{selectedCert.internName}</span>
                </div>

                <div className="space-y-4 max-w-md mx-auto leading-relaxed text-xs font-sans text-slate-650 h-24">
                  <p>
                    Has successfully completed the customized training requirements as an engineering candidate specializing in{' '}
                    <strong className="text-slate-850 font-bold">{selectedCert.domain}</strong>. The candidate executed production code solutions, Checked in/out daily via UTC logs and finalized core Kanban pipeline milestones over a length of <strong className="text-slate-850 font-bold">{selectedCert.duration}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-12 pt-10 text-[10px] font-sans">
                  <div className="border-t border-slate-300 pt-2 flex flex-col items-center">
                    <span className="font-semibold text-slate-800 italic h-5">{selectedCert.mentorName}</span>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1">Mentor Signatory</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2 flex flex-col items-center">
                    <span className="font-mono font-bold text-slate-800 h-5">{selectedCert.issueDate}</span>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1">Issue Date Reference</span>
                  </div>
                </div>

                <div className="pt-6 text-[9px] font-sans font-medium text-slate-400 tracking-wider">
                  Verified publicly at portal root with ID <span className="font-mono font-bold text-indigo-600 bg-slate-50 px-1.5 py-0.5 rounded">{selectedCert.certificateId}</span>.
                </div>
              </div>

              {/* Watermark circle background */}
              <div className="absolute top-1/2 left-1/2 -ml-32 -mt-32 w-64 h-64 border-4 border-slate-50 text-slate-50 rounded-full font-serif font-black flex items-center justify-center pointer-events-none select-none text-[8rem] opacity-5">
                CERT
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 bg-white border border-slate-200 rounded-3xl text-center text-slate-400">
            <Award className="w-12 h-12 text-slate-200 mx-auto mb-2" />
            <p className="text-xs">No certificate selected</p>
          </div>
        )}
      </div>
    </div>
  );
}
