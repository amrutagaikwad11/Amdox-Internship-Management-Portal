import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_FILE = path.join(process.cwd(), 'database.json');

export class Database {
  constructor() {
    this.users = [];
    this.interns = [];
    this.mentors = [];
    this.allocations = [];
    this.tasks = [];
    this.submissions = [];
    this.attendance = [];
    this.evaluations = [];
    this.certificates = [];
    this.load();
    if (this.users.length === 0) {
      this.seed();
    }
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        this.users = data.users || [];
        this.interns = data.interns || [];
        this.mentors = data.mentors || [];
        this.allocations = data.allocations || [];
        this.tasks = data.tasks || [];
        this.submissions = data.submissions || [];
        this.attendance = data.attendance || [];
        this.evaluations = data.evaluations || [];
        this.certificates = data.certificates || [];
      }
    } catch (e) {
      console.error('Error loading database, resetting', e);
    }
  }

  save() {
    try {
      const data = {
        users: this.users,
        interns: this.interns,
        mentors: this.mentors,
        allocations: this.allocations,
        tasks: this.tasks,
        submissions: this.submissions,
        attendance: this.attendance,
        evaluations: this.evaluations,
        certificates: this.certificates,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving database', e);
    }
  }

  hashPassword(pwd) {
    return crypto.createHash('sha256').update(pwd).digest('hex');
  }

  seed() {
    // Hash default password for easy demo
    const defaultHash = this.hashPassword('password123');

    // 1. Users
    this.users = [
      { id: 'usr-admin', email: 'admin@portal.com', passwordHash: defaultHash, name: 'Alex Rivera', role: 'Admin', profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
      { id: 'usr-mentor1', email: 'sarah@portal.com', passwordHash: defaultHash, name: 'Sarah Jenkins', role: 'Mentor', profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
      { id: 'usr-mentor2', email: 'david@portal.com', passwordHash: defaultHash, name: 'David Lee', role: 'Mentor', profilePhoto: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' },
      { id: 'usr-intern1', email: 'alice@portal.com', passwordHash: defaultHash, name: 'Alice Cooper', role: 'Intern', profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
      { id: 'usr-intern2', email: 'bob@portal.com', passwordHash: defaultHash, name: 'Bob Smith', role: 'Intern', profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { id: 'usr-intern3', email: 'charlie@portal.com', passwordHash: defaultHash, name: 'Charlie Brown', role: 'Intern', profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
      { id: 'usr-intern4', email: 'diana@portal.com', passwordHash: defaultHash, name: 'Diana Prince', role: 'Intern', profilePhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    ];

    // 2. Mentors
    this.mentors = [
      { id: 'mnt-1', userId: 'usr-mentor1', name: 'Sarah Jenkins', email: 'sarah@portal.com', department: 'UI/UX & Frontend', expertise: 'React, Tailwind CSS, SVG layouts' },
      { id: 'mnt-2', userId: 'usr-mentor2', name: 'David Lee', email: 'david@portal.com', department: 'Backend Systems', expertise: 'Java Spring Boot, Express, MySQL' },
    ];

    // 3. Interns
    this.interns = [
      { id: 'int-1', userId: 'usr-intern1', name: 'Alice Cooper', email: 'alice@portal.com', college: 'Boston University', skills: ['React', 'JavaScript', 'Tailwind CSS'], domain: 'Frontend Engineering', joiningDate: '2026-04-01', profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
      { id: 'int-2', userId: 'usr-intern2', name: 'Bob Smith', email: 'bob@portal.com', college: 'NYU Stern', skills: ['Node.js', 'Express', 'SQL'], domain: 'Full-Stack Engineering', joiningDate: '2026-05-01', profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
      { id: 'int-3', userId: 'usr-intern3', name: 'Charlie Brown', email: 'charlie@portal.com', college: 'UC Berkeley', skills: ['Python', 'Pandas', 'Stats'], domain: 'Data Science', joiningDate: '2026-05-15', profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
      { id: 'int-4', userId: 'usr-intern4', name: 'Diana Prince', email: 'diana@portal.com', college: 'UT Austin', skills: ['Docker', 'AWS', 'Bash'], domain: 'DevOps & Systems', joiningDate: '2026-05-15', profilePhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    ];

    // 4. Mentor Allocations
    this.allocations = [
      { id: 'alc-1', mentorId: 'mnt-1', internId: 'int-1', allocatedDate: '2026-04-01' },
      { id: 'alc-2', mentorId: 'mnt-2', internId: 'int-2', allocatedDate: '2026-05-01' },
      { id: 'alc-3', mentorId: 'mnt-2', internId: 'int-3', allocatedDate: '2026-05-15' },
      { id: 'alc-4', mentorId: 'mnt-2', internId: 'int-4', allocatedDate: '2026-05-15' },
    ];

    // 5. Tasks
    this.tasks = [
      { id: 'tsk-1', title: 'Implement Interactive Rails Dashboard', description: 'Create a fully responsive side navigation rail workspace setup matching Figma designs. Incorporate dark/light styling.', deadline: '2026-06-15', priority: 'High', status: 'Completed', assigneeId: 'int-1', createdById: 'usr-mentor1', createdAt: '2026-04-05' },
      { id: 'tsk-2', title: 'Interactive SVG Dashboard Statistics', description: 'Construct animated responsive SVG diagrams mirroring real-world completions and attendance scores in real-time.', deadline: '2026-06-20', priority: 'High', status: 'In Progress', assigneeId: 'int-1', createdById: 'usr-mentor1', createdAt: '2026-04-25' },
      { id: 'tsk-3', title: 'Design REST Controller Endpoints', description: 'Build REST controller classes inside the main Spring Boot workspace. Guard routes via JWT filters.', deadline: '2026-06-15', priority: 'High', status: 'In Progress', assigneeId: 'int-2', createdById: 'usr-mentor2', createdAt: '2026-05-05' },
      { id: 'tsk-4', title: 'Configure JPA Data Indexes', description: 'Construct appropriate database table search indexing layout to keep internship reports highly performant under scale.', deadline: '2026-06-30', priority: 'Medium', status: 'Pending', assigneeId: 'int-2', createdById: 'usr-mentor2', createdAt: '2026-05-10' },
      { id: 'tsk-5', title: 'Data Analysis Python Pipeline', description: 'Clean current tracking output log metrics. Design dynamic panda scripts predicting daily check-ins patterns.', deadline: '2026-05-28', priority: 'Medium', status: 'Completed', assigneeId: 'int-3', createdById: 'usr-mentor2', createdAt: '2026-05-18' },
    ];

    // 6. Submissions
    this.submissions = [
      { id: 'sub-1', taskId: 'tsk-1', internId: 'int-1', githubUrl: 'https://github.com/alice/dashboard-rails', notes: 'Created smooth transitions, responsive drawer mechanics, completely in line with UX mandates.', timestamp: '2026-04-14T10:30:00Z', status: 'Approved', feedback: 'Amazing front-end fidelity. The layout transition behaves consistently across targets.', reviewedBy: 'mnt-1', reviewedAt: '2026-04-15T14:20:00Z' },
      { id: 'sub-2', taskId: 'tsk-5', internId: 'int-3', githubUrl: 'https://github.com/charlie/data-pipelines', notes: 'Output file uploaded and parsed successfully. Charts rendered as expected.', timestamp: '2026-05-27T16:00:00Z', status: 'Approved', feedback: 'Methodology looks sound, statistical projections are neatly validated.', reviewedBy: 'mnt-2', reviewedAt: '2026-05-28T11:45:00Z' },
    ];

    // 7. Attendance
    const dates = ['2026-05-28', '2026-05-29', '2026-06-01', '2026-06-02', '2026-06-03'];
    let attId = 1;
    this.interns.forEach((intern) => {
      dates.forEach((date, index) => {
        const isLate = index % 4 === 1 && intern.id === 'int-2';
        const isAbsent = index === 2 && intern.id === 'int-3';

        this.attendance.push({
          id: `att-${attId++}`,
          internId: intern.id,
          date,
          checkIn: isAbsent ? '' : (isLate ? '09:30:15' : '08:52:10'),
          checkOut: isAbsent ? '' : '17:05:40',
          status: isAbsent ? 'Absent' : (isLate ? 'Late' : 'Present'),
        });
      });
    });

    // 8. Evaluations
    this.evaluations = [
      {
        id: 'ev-1',
        internId: 'int-1',
        mentorId: 'mnt-1',
        date: '2026-04-30',
        ratings: {
          communication: 5,
          taskCompletion: 4,
          technicalSkills: 4,
          attendance: 5,
          teamCollaboration: 5,
        },
        overallComments: 'Alice has integrated extremely well. Her front-end work is thorough and she is highly communicative.',
        perfSummary: 'Alice demonstrates strong visual design and structure layout proficiency. Her attendance records remain spotless.'
      },
    ];

    // 9. Certificates
    this.certificates = [
      {
        id: 'cert-1',
        internId: 'int-1',
        certificateId: 'INT-2026-X8Y1A',
        domain: 'Frontend Engineering',
        duration: '2 Months',
        mentorName: 'Sarah Jenkins',
        issueDate: '2026-06-01',
      }
    ];

    this.save();
  }
}
