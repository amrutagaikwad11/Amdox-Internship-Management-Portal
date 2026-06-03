import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Database } from './db.js';
import { generateToken, verifyToken } from './auth.js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(express.json({ limit: '20mb' }));

const db = new Database();

// Initialize GoogleGenAI SDK safely
let ai = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize Google GenAI SDK:', err.message);
  }
}

// REST Middlewares
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authorization header token is missing' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired session token' });
  }

  req.user = payload;
  next();
};

const permitRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access prohibited: Insufficient authorizations' });
    }
    next();
  };
};

/* Authentication Routes */

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(400).json({ error: 'Account credentials not found' });
  }

  const pash = db.hashPassword(password);
  if (user.passwordHash !== pash) {
    return res.status(400).json({ error: 'Incorrect credentials' });
  }

  // Cross reference intern / mentor IDs
  let internId = null;
  let mentorId = null;

  if (user.role === 'Intern') {
    const foundInt = db.interns.find((i) => i.userId === user.id);
    if (foundInt) internId = foundInt.id;
  } else if (user.role === 'Mentor') {
    const foundMent = db.mentors.find((m) => m.userId === user.id);
    if (foundMent) mentorId = foundMent.id;
  }

  const payload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    internId,
    mentorId,
  };

  const token = generateToken(payload);
  res.json({ token, user: payload });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role, mentorDepartment } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ error: 'The email is already registered' });
  }

  const newUserId = `usr-${Date.now()}`;
  const passwordHash = db.hashPassword(password);

  const newUser = {
    id: newUserId,
    email: email.toLowerCase().trim(),
    name,
    role,
    passwordHash,
    profilePhoto: '',
  };

  db.users.push(newUser);

  if (role === 'Mentor') {
    const newMntId = `mnt-${Date.now()}`;
    db.mentors.push({
      id: newMntId,
      userId: newUserId,
      name,
      email: email.toLowerCase().trim(),
      department: mentorDepartment || 'General Engineering',
      expertise: '',
    });
  }

  db.save();
  res.status(201).json({ success: true, userId: newUserId });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});


/* Onboarding & Intern Management */

app.get('/api/interns', authenticateToken, (req, res) => {
  // Annotate interns with their linked mentors and attendance rates
  const internsWithMentors = db.interns.map((intern) => {
    // Find Mentor allocation
    const alloc = db.allocations.find((a) => a.internId === intern.id);
    let mentorName = 'Not Allocated';
    let mentorId = null;

    if (alloc) {
      const mentor = db.mentors.find((m) => m.id === alloc.mentorId);
      if (mentor) {
        mentorName = mentor.name;
        mentorId = mentor.id;
      }
    }

    // Calculate actual attendance rate
    const logs = db.attendance.filter((a) => a.internId === intern.id);
    const totalDays = logs.length;
    const presents = logs.filter((l) => l.status === 'Present' || l.status === 'Late').length;
    const attendanceRate = totalDays > 0 ? Math.round((presents / totalDays) * 100) : 100;

    return {
      ...intern,
      mentorName,
      mentorId,
      attendanceRate,
    };
  });

  res.json(internsWithMentors);
});

app.post('/api/interns', authenticateToken, permitRoles('Admin'), (req, res) => {
  const { name, email, college, skills, domain, joiningDate } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and Email are required to onboard' });
  }

  // Ensure user credential accounts are generated automatically
  const defaultPwd = 'password123';
  const pash = db.hashPassword(defaultPwd);

  const existUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (existUser) {
    return res.status(400).json({ error: 'User email already exists in portal credentials' });
  }

  const userId = `usr-${Date.now()}`;
  db.users.push({
    id: userId,
    email: email.toLowerCase().trim(),
    name,
    passwordHash: pash,
    role: 'Intern',
    profilePhoto: '',
  });

  const internId = `int-${Date.now()}`;
  const newIntern = {
    id: internId,
    userId,
    name,
    email: email.toLowerCase().trim(),
    college: college || '',
    skills: skills || [],
    domain: domain || 'Frontend Engineering',
    joiningDate: joiningDate || new Date().toISOString().split('T')[0],
    profilePhoto: '',
    resumeUrl: '',
  };

  db.interns.push(newIntern);

  // Auto Allocate to Least Loaded Mentor if mentors available
  if (db.mentors.length > 0) {
    const mentorLoads = db.mentors.map((m) => {
      const activeCount = db.allocations.filter((a) => a.mentorId === m.id).length;
      return { id: m.id, count: activeCount };
    });

    mentorLoads.sort((a, b) => a.count - b.count);
    const hostMentorId = mentorLoads[0].id;

    db.allocations.push({
      id: `alc-${Date.now()}`,
      mentorId: hostMentorId,
      internId,
      allocatedDate: newIntern.joiningDate,
    });
  }

  db.save();
  res.status(201).json(newIntern);
});

app.put('/api/interns/:id', authenticateToken, (req, res) => {
  const internId = req.params.id;
  // Admin or the owner Intern can edit
  const isOwner = req.user.role === 'Intern' && req.user.internId === internId;
  const isAdmin = req.user.role === 'Admin';
  const isMentor = req.user.role === 'Mentor';

  if (!isOwner && !isAdmin && !isMentor) {
    return res.status(403).json({ error: 'Unauthorized to modify intern' });
  }

  const idx = db.interns.findIndex((i) => i.id === internId);
  if (idx === -1) {
    return res.status(450).json({ error: 'Intern not found' });
  }

  const original = db.interns[idx];
  const { skills, college, profilePhoto, resumeUrl, name } = req.body;

  if (skills !== undefined) original.skills = skills;
  if (college !== undefined) original.college = college;
  if (profilePhoto !== undefined) original.profilePhoto = profilePhoto;
  if (resumeUrl !== undefined) original.resumeUrl = resumeUrl;
  if (name !== undefined) {
    original.name = name;
    // Update credentials user name too
    const user = db.users.find((u) => u.id === original.userId);
    if (user) user.name = name;
  }

  db.save();
  res.json(original);
});

app.delete('/api/interns/:id', authenticateToken, permitRoles('Admin'), (req, res) => {
  const internId = req.params.id;
  const intern = db.interns.find((i) => i.id === internId);

  if (!intern) {
    return res.status(404).json({ error: 'Intern record not found' });
  }

  // Purge ALL associated values sequentially
  db.interns = db.interns.filter((i) => i.id !== internId);
  db.users = db.users.filter((u) => u.id !== intern.userId);
  db.allocations = db.allocations.filter((a) => a.internId !== internId);
  db.tasks = db.tasks.filter((t) => t.assigneeId !== internId);
  db.submissions = db.submissions.filter((s) => s.internId !== internId);
  db.attendance = db.attendance.filter((a) => a.internId !== internId);
  db.evaluations = db.evaluations.filter((e) => e.internId !== internId);
  db.certificates = db.certificates.filter((c) => c.internId !== internId);

  db.save();
  res.json({ success: true, message: 'Intern purged successfully' });
});


/* Mentors & Allocation Management */

app.get('/api/mentors', authenticateToken, (req, res) => {
  res.json(db.mentors);
});

app.post('/api/allocations', authenticateToken, permitRoles('Admin'), (req, res) => {
  const { internId, mentorId } = req.body;
  if (!internId || !mentorId) {
    return res.status(400).json({ error: 'InternId and MentorId are required' });
  }

  // Clean old allocations for this intern
  db.allocations = db.allocations.filter((a) => a.internId !== internId);

  // Set new allocation
  db.allocations.push({
    id: `alc-${Date.now()}`,
    mentorId,
    internId,
    allocatedDate: new Date().toISOString().split('T')[0],
  });

  db.save();
  res.json({ success: true });
});


/* Task Pipelines (Kanban) Middlewares */

app.get('/api/tasks', authenticateToken, (req, res) => {
  // If Intern, return their assigned tasks
  // Else (Admin/Mentor), return all tasks
  let filtered = db.tasks;
  if (req.user.role === 'Intern') {
    filtered = db.tasks.filter((t) => t.assigneeId === req.user.internId);
  }

  // Append count and assignee metadata
  const enriched = filtered.map((t) => {
    const assignee = db.interns.find((i) => i.id === t.assigneeId);
    const count = db.submissions.filter((s) => s.taskId === t.id).length;
    return {
      ...t,
      assigneeName: assignee ? assignee.name : 'Unknown Assignee',
      submissionsCount: count,
    };
  });

  res.json(enriched);
});

app.post('/api/tasks', authenticateToken, permitRoles('Admin', 'Mentor'), (req, res) => {
  const { title, description, deadline, priority, assigneeId } = req.body;
  if (!title || !deadline || !assigneeId) {
    return res.status(400).json({ error: 'Title, deadline and assignee variables are required' });
  }

  const newTask = {
    id: `tsk-${Date.now()}`,
    title,
    description: description || '',
    deadline,
    priority: priority || 'Medium',
    status: 'Pending',
    assigneeId,
    createdById: req.user.userId,
    createdAt: new Date().toISOString().split('T')[0],
  };

  db.tasks.push(newTask);
  db.save();
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // If Intern, ensure they are the assignee
  if (req.user.role === 'Intern' && task.assigneeId !== req.user.internId) {
    return res.status(403).json({ error: 'Access prohibited: Task is not assigned to you' });
  }

  const { status, title, description, deadline, priority } = req.body;
  if (status !== undefined) task.status = status;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (deadline !== undefined) task.deadline = deadline;
  if (priority !== undefined) task.priority = priority;

  db.save();
  res.json(task);
});

app.delete('/api/tasks/:id', authenticateToken, permitRoles('Admin', 'Mentor'), (req, res) => {
  const taskId = req.params.id;
  db.tasks = db.tasks.filter((t) => t.id !== taskId);
  db.submissions = db.submissions.filter((s) => s.taskId !== taskId);
  db.save();
  res.json({ success: true });
});


/* Deliverables / Code Submissions */

app.get('/api/submissions', authenticateToken, (req, res) => {
  let list = db.submissions;
  if (req.user.role === 'Intern') {
    list = db.submissions.filter((s) => s.internId === req.user.internId);
  } else if (req.user.role === 'Mentor') {
    // Show submissions for interns assigned to this mentor
    const assignedIntIds = db.allocations
      .filter((a) => a.mentorId === req.user.mentorId)
      .map((a) => a.internId);
    list = db.submissions.filter((s) => assignedIntIds.includes(s.internId));
  }

  const enriched = list.map((s) => {
    const intInfo = db.interns.find((i) => i.id === s.internId);
    const taskInfo = db.tasks.find((t) => t.id === s.taskId);
    return {
      ...s,
      internName: intInfo ? intInfo.name : 'Unknown Intern',
      taskTitle: taskInfo ? taskInfo.title : 'Deleted Task',
    };
  });

  res.json(enriched);
});

app.post('/api/submissions', authenticateToken, permitRoles('Intern'), (req, res) => {
  const { taskId, githubUrl, notes } = req.body;
  if (!taskId || !githubUrl) {
    return res.status(400).json({ error: 'TaskId and GitHub URL links are required' });
  }

  // Ensure task exists and is assigned to the current user
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task || task.assigneeId !== req.user.internId) {
    return res.status(400).json({ error: 'Invalid task assignee authorization' });
  }

  // If already submitted, clean old submission for this task
  db.submissions = db.submissions.filter((s) => s.taskId !== taskId);

  const subId = `sub-${Date.now()}`;
  const newSubmission = {
    id: subId,
    taskId,
    internId: req.user.internId,
    githubUrl,
    notes: notes || '',
    timestamp: new Date().toISOString(),
    status: 'In Review',
    feedback: '',
    reviewedBy: null,
    reviewedAt: null,
  };

  db.submissions.push(newSubmission);

  // Automatically shift Task Kanban Pipeline to Completion/In Progress
  task.status = 'In Progress';

  db.save();
  res.status(201).json(newSubmission);
});

app.put('/api/submissions/:id/review', authenticateToken, permitRoles('Admin', 'Mentor'), (req, res) => {
  const submissionId = req.params.id;
  const sub = db.submissions.find((s) => s.id === submissionId);
  if (!sub) {
    return res.status(404).json({ error: 'Code deliverable submission not found' });
  }

  const { status, feedback } = req.body;
  if (!status || !['Approved', 'Changes Requested'].includes(status)) {
    return res.status(400).json({ error: 'Provide valid review status outcome' });
  }

  sub.status = status;
  sub.feedback = feedback || '';
  sub.reviewedBy = req.user.userId;
  sub.reviewedAt = new Date().toISOString();

  // If Appoved, finalize corresponding Kanban Board status to Completed
  if (status === 'Approved') {
    const task = db.tasks.find((t) => t.id === sub.taskId);
    if (task) task.status = 'Completed';
  }

  db.save();
  res.json(sub);
});


/* Attendance Management System */

app.get('/api/attendance/log', authenticateToken, (req, res) => {
  let list = db.attendance;
  if (req.user.role === 'Intern') {
    list = db.attendance.filter((a) => a.internId === req.user.internId);
  }

  const enriched = list.map((a) => {
    const student = db.interns.find((i) => i.id === a.internId);
    return {
      ...a,
      internName: student ? student.name : 'Unknown Intern',
    };
  });

  res.json(enriched);
});

app.post('/api/attendance/check-in', authenticateToken, permitRoles('Intern'), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const existing = db.attendance.find((a) => a.internId === req.user.internId && a.date === today);

  if (existing && existing.checkIn) {
    return res.status(400).json({ error: 'You have already checked-in today' });
  }

  const nowTime = new Date().toTimeString().split(' ')[0]; // E.g., "09:05:00"
  const baselineTime = '09:00:00';
  const status = nowTime > baselineTime ? 'Late' : 'Present';

  if (existing) {
    existing.checkIn = nowTime;
    existing.status = status;
  } else {
    db.attendance.push({
      id: `att-${Date.now()}`,
      internId: req.user.internId,
      date: today,
      checkIn: nowTime,
      checkOut: '',
      status,
    });
  }

  db.save();
  res.json({ success: true, checkIn: nowTime, status });
});

app.post('/api/attendance/check-out', authenticateToken, permitRoles('Intern'), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const existing = db.attendance.find((a) => a.internId === req.user.internId && a.date === today);

  if (!existing || !existing.checkIn) {
    return res.status(400).json({ error: 'Complete today check-in before checking-out' });
  }

  if (existing.checkOut) {
    return res.status(400).json({ error: 'Check-out already verified today' });
  }

  const nowTime = new Date().toTimeString().split(' ')[0];
  existing.checkOut = nowTime;

  db.save();
  res.json({ success: true, checkOut: nowTime });
});


/* Evaluation & AI-based Feedback Modules */

app.get('/api/evaluations', authenticateToken, (req, res) => {
  let list = db.evaluations;
  if (req.user.role === 'Intern') {
    list = db.evaluations.filter((e) => e.internId === req.user.internId);
  }

  const enriched = list.map((e) => {
    const student = db.interns.find((i) => i.id === e.internId);
    const parentUser = db.users.find((u) => u.id === e.mentorId);
    return {
      ...e,
      internName: student ? student.name : 'Unknown Intern',
      mentorName: parentUser ? parentUser.name : 'Unknown Mentor',
    };
  });

  res.json(enriched);
});

app.post('/api/evaluations', authenticateToken, permitRoles('Admin', 'Mentor'), (req, res) => {
  const { internId, ratings, overallComments } = req.body;
  if (!internId || !ratings || typeof ratings !== 'object') {
    return res.status(400).json({ error: 'InternId and rating points fields are required' });
  }

  const { communication, taskCompletion, technicalSkills, attendance, teamCollaboration } = ratings;
  
  const score = (
    Number(communication || 0) +
    Number(taskCompletion || 0) +
    Number(technicalSkills || 0) +
    Number(attendance || 0) +
    Number(teamCollaboration || 0)
  ) / 5;

  const evaluationId = `ev-${Date.now()}`;
  const newEvaluation = {
    id: evaluationId,
    internId,
    mentorId: req.user.userId,
    date: new Date().toISOString().split('T')[0],
    ratings: {
      communication: Number(communication || 0),
      taskCompletion: Number(taskCompletion || 0),
      technicalSkills: Number(technicalSkills || 0),
      attendance: Number(attendance || 0),
      teamCollaboration: Number(teamCollaboration || 0),
    },
    overallComments: overallComments || '',
    perfSummary: `Performance index score: ${score.toFixed(1)}/5.0. Verified manually by mentor.`,
  };

  db.evaluations.push(newEvaluation);
  db.save();
  res.status(201).json(newEvaluation);
});

app.post('/api/evaluations/gemini-analysis', authenticateToken, permitRoles('Admin', 'Mentor'), async (req, res) => {
  const { internId, ratings, comments } = req.body;
  
  if (!internId || !ratings) {
    return res.status(400).json({ error: 'InternId and actual performance statistics are required' });
  }

  const student = db.interns.find((i) => i.id === internId);
  if (!student) {
    return res.status(404).json({ error: 'Intern credentials missing' });
  }

  // Get student's telemetry
  const attendanceLogs = db.attendance.filter((a) => a.internId === internId);
  const totalDays = attendanceLogs.length;
  const presents = attendanceLogs.filter((l) => l.status === 'Present').length;
  const lates = attendanceLogs.filter((l) => l.status === 'Late').length;
  const absents = attendanceLogs.filter((l) => l.status === 'Absent').length;

  const tasksData = db.tasks.filter((t) => t.assigneeId === internId);
  const completedCount = tasksData.filter((t) => t.status === 'Completed').length;
  const progressCount = tasksData.filter((t) => t.status === 'In Progress').length;
  const pendingCount = tasksData.filter((t) => t.status === 'Pending').length;

  const prompt = `
     You are an AI Professional Mentor specialized in student reviews for active software engineering/data science tracks.
     Evaluate the developmental achievements of the student program candidate below:
     Candidate: ${student.name}
     Track Specialization: ${student.domain}
     Core Registered Skills: ${student.skills.join(', ')}
     
     Current Performance Ratings:
     - Communication: ${ratings.communication}/5
     - Task Completion: ${ratings.taskCompletion}/5
     - Technical Skills: ${ratings.technicalSkills}/5
     - Attendance & Timeliness: ${ratings.attendance}/5
     - Team Collaboration: ${ratings.teamCollaboration}/5
     
     Attendance Telemetry Log (Total logged days: ${totalDays}):
     - Presents: ${presents}
     - Late entry check-ins: ${lates}
     - Absent: ${absents}

     Kanban Task Progress Pipeline:
     - Completed tasks: ${completedCount}
     - Active / In Progress milestones: ${progressCount}
     - Backlog tasks: ${pendingCount}

     Mentor Commentary notes: "${comments || 'No direct notes provided.'}"

     Generate a structured, professional performance evaluation review. Focus on strengths, pinpoint areas for advancement based on skills, and outline recommendations for career longevity. Keep the message highly encouraging, objective and action-focused. Format utilizing clean bullet points in Markdown. Keep it concise.
  `;

  // Safe fallback if API Key is not set or SDK fails
  if (!ai) {
    const score = (
      Number(ratings.communication || 0) +
      Number(ratings.taskCompletion || 0) +
      Number(ratings.technicalSkills || 0) +
      Number(ratings.attendance || 0) +
      Number(ratings.teamCollaboration || 0)
    ) / 5;

    const fallbackSummary = `
      ### **Performance Analytics (Manual Fallback)**
      *   **Strengths Recognized**: The student demonstrates practical experience in **${student.domain}** topics. Skills like **${student.skills.slice(0, 3).join(', ')}** have been utilized.
      *   **Progress Indicators**: Achieved overall evaluation index score of **${score.toFixed(1)}/5.0**. Fully executed **${completedCount}** backlog deliveries.
      *   **Areas of Growth**: Focus on maintaining consistency in daily check-in logs. Continue fine-tuning advanced algorithms.
    `;
    return res.json({ analysis: fallbackSummary });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });
    res.json({ analysis: response.text });
  } catch (err) {
    console.error('Error generating Gemini evaluation analysis:', err);
    res.status(500).json({ error: 'Failed to generate AI evaluation report' });
  }
});


/* Core Certificate Issuance & Validations */

app.get('/api/certificates', authenticateToken, (req, res) => {
  let list = db.certificates;
  if (req.user.role === 'Intern') {
    list = db.certificates.filter((c) => c.internId === req.user.internId);
  }

  const enriched = list.map((c) => {
    const student = db.interns.find((i) => i.id === c.internId);
    return {
      ...c,
      internName: student ? student.name : 'Unknown Intern',
    };
  });

  res.json(enriched);
});

app.post('/api/certificates', authenticateToken, permitRoles('Admin'), (req, res) => {
  const { internId, domain, duration, mentorName } = req.body;
  if (!internId || !domain) {
    return res.status(400).json({ error: 'InternId and specialized domain are required' });
  }

  const student = db.interns.find((i) => i.id === internId);
  if (!student) {
    return res.status(404).json({ error: 'Registered student not found in roster' });
  }

  // Ensure unique certificate is generated
  const hash = crypto.randomBytes(4).toString('hex').toUpperCase();
  const certCode = `INT-${new Date().getFullYear()}-${hash}`;

  const idx = db.certificates.findIndex((c) => c.internId === internId);
  if (idx !== -1) {
    return res.status(400).json({ error: 'Intern already has a certificate on file' });
  }

  const newCertificate = {
    id: `cert-${Date.now()}`,
    internId,
    certificateId: certCode,
    domain,
    duration: duration || '3 Months',
    mentorName: mentorName || 'Lead Board Architect',
    issueDate: new Date().toISOString().split('T')[0],
  };

  db.certificates.push(newCertificate);
  db.save();
  res.status(201).json(newCertificate);
});

// Verification route (Publicly open!)
app.get('/api/certificates/verify/:id', (req, res) => {
  const certId = req.params.id.toUpperCase();
  const cert = db.certificates.find((c) => c.certificateId === certId);

  if (!cert) {
    return res.status(404).json({ verified: false, error: 'Certificate record was not verified in database logs' });
  }

  const student = db.interns.find((i) => i.id === cert.internId);
  res.json({
    verified: true,
    certificateId: cert.certificateId,
    candidateName: student ? student.name : 'Unknown Intern',
    issueDate: cert.issueDate,
    domain: cert.domain,
    duration: cert.duration,
    mentorSignature: cert.mentorName,
  });
});


/* Custom simulated Cloud Asset Storage Upload mock */

app.post('/api/upload', authenticateToken, (req, res) => {
  const { name, base64 } = req.body;
  if (!name || !base64) {
    return res.status(400).json({ error: 'FileName and base64 contents are required' });
  }

  // Generate a mock URL representing direct persistent storage references
  const secureId = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(name) || '.bin';
  const url = `https://storage.googleapis.com/internship_assets_run/onboarding_${secureId}${extension}`;

  res.json({ url });
});


/* Analytics / Admin Workspace Analytics Telemetry */

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const totalInterns = db.interns.length;
  const activeInternships = db.interns.length; // Assumed all onboarded are active
  const totalTasks = db.tasks.length;
  const completedTasks = db.tasks.filter((t) => t.status === 'Completed').length;
  const totalSubmissions = db.submissions.length;

  // Average attendance rate calculations across active days
  let totalRatingSum = 0;
  let countRecords = 0;

  db.interns.forEach((intern) => {
    const logs = db.attendance.filter((a) => a.internId === intern.id);
    if (logs.length > 0) {
      const presents = logs.filter((l) => l.status === 'Present' || l.status === 'Late').length;
      totalRatingSum += (presents / logs.length);
      countRecords++;
    }
  });

  const attendanceRate = countRecords > 0 ? Math.round((totalRatingSum / countRecords) * 100) : 100;

  // Task statuses analytics
  const pending = db.tasks.filter((t) => t.status === 'Pending').length;
  const inProgress = db.tasks.filter((t) => t.status === 'In Progress').length;
  const completed = db.tasks.filter((t) => t.status === 'Completed').length;

  // Intern Domain stats
  const domainsMap = {};
  db.interns.forEach((i) => {
    domainsMap[i.domain] = (domainsMap[i.domain] || 0) + 1;
  });

  const domainStats = Object.keys(domainsMap).map((key) => ({
    name: key,
    count: domainsMap[key],
  }));

  // Log recent code reviews/submissions
  const recentSubmissions = db.submissions.slice(-5).map((s) => {
    const intern = db.interns.find((i) => i.id === s.internId);
    const task = db.tasks.find((t) => t.id === s.taskId);
    return {
      id: s.id,
      internName: intern ? intern.name : 'Unknown Intern',
      taskTitle: task ? task.title : 'Deleted Task',
      status: s.status,
      timestamp: s.timestamp,
    };
  });

  res.json({
    totalInterns,
    activeInternships,
    totalTasks,
    completedTasks,
    totalSubmissions,
    attendanceRate,
    taskStatusStats: { pending, inProgress, completed },
    domainStats,
    recentSubmissions,
  });
});


// Serve static Vite SPA files in production or hook programmatic dev server
if (process.env.NODE_ENV !== 'production' && process.env.VITE_DEV !== 'false') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Port server starting successfully and bound onto internal port => :${PORT}`);
});
