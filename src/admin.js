import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db, ADMIN_UID, NILANTHA_MODERATORS, RAVINDU_MODERATORS } from "./firebase.js";
import { escapeHTML, sanitizeInput, sanitizeUrl } from "./security.js";

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function showFloatingModal(htmlContent) {
  const modal = document.getElementById('floating-modal');
  if (!modal) return;
  modal.innerHTML = `
    <div class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onclick="if(event.target === this) window.closeFloatingModal()">
        <div class="bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative custom-scrollbar">
            <button onclick="window.closeFloatingModal()" class="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl text-lg font-bold cursor-pointer transition-colors" title="Close">✕</button>
            ${htmlContent}
        </div>
    </div>
  `;
  modal.classList.remove('hidden');
}

export function closeFloatingModal() {
  const modal = document.getElementById('floating-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.innerHTML = '';
  }
}
window.closeFloatingModal = closeFloatingModal;

async function sendNotification(recipientId, title, message) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId: recipientId,
      title: title,
      message: message,
      timestamp: Date.now(),
      read: false
    });
    return true;
  } catch (e) {
    console.error("sendNotification error:", e);
    return e;
  }
}

async function broadcastNotification(title, message) {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const promises = usersSnap.docs.map(u => {
      return addDoc(collection(db, 'notifications'), {
        userId: u.id,
        title: title,
        message: message,
        timestamp: Date.now(),
        read: false
      });
    });
    await Promise.all(promises);
    return true;
  } catch (e) {
    console.error("broadcastNotification error:", e);
    return false;
  }
}

export async function renderAdmin(user) {
  const appContainer = document.getElementById('app-container');
  if (!appContainer) return;

  appContainer.innerHTML = `
    <div class="max-w-7xl mx-auto">
        <!-- Top Toolbar -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h2 class="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>Admin Console</span>
                    <span class="text-xs bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/30">Secure Portal</span>
                </h2>
                <p class="text-xs text-[var(--text-secondary)] mt-1">StudyTracker Pro Platform Administration & Oversight</p>
            </div>
            <div class="flex gap-2 flex-wrap">
                <button onclick="window.fixUserNames()" class="btn-ghost text-xs" title="Fix First/Last Names in DB">
                    <span>🔧</span> Names
                </button>
                <button onclick="window.openEmailRequestsModal()" class="btn-ghost text-xs">
                    <span>📧</span> Requests
                </button>
                <button onclick="window.openContactMessagesModal()" class="btn-ghost text-xs text-cyan-400 hover:text-cyan-300">
                    <span>💬</span> Messages
                </button>
                <button onclick="window.openBroadcastModal()" class="btn-primary text-xs bg-red-600 hover:bg-red-700">
                    <span>📢</span> Broadcast
                </button>
                <button onclick="window.openGlobalPopupModal()" class="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700">
                    <span>📣</span> Global Pop-up
                </button>
                <button onclick="window.openVikumResourcesModal()" class="btn-primary text-xs bg-purple-600 hover:bg-purple-700">
                    <span>🔗</span> Vikum Link
                </button>
                <button onclick="window.openLectureHallPermissionsModal()" class="btn-primary text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-600/25">
                    <span>📚</span> Lecture Hall Access
                </button>
            </div>
        </div>
        
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="smart-card text-center cursor-pointer hover:border-indigo-500 transition-colors" id="active-users-card">
                <h3 class="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Active Users</h3>
                <p id="active-users-count" class="text-4xl font-extrabold text-indigo-400">—</p>
                <p class="text-xs text-[var(--text-secondary)] mt-1">Active within 5 mins (Click to view)</p>
            </div>
            <div class="smart-card text-center cursor-pointer hover:border-cyan-500 transition-colors" id="daily-logins-card">
                <h3 class="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Daily Logins</h3>
                <p id="daily-logins-count" class="text-4xl font-extrabold text-cyan-400">—</p>
                <p class="text-xs text-[var(--text-secondary)] mt-1">Today's unique visitors (Click to view)</p>
            </div>
            <div class="smart-card text-center">
                <h3 class="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Total Students</h3>
                <p id="total-users-count" class="text-4xl font-extrabold text-emerald-400">—</p>
                <p class="text-xs text-[var(--text-secondary)] mt-1">Total registered accounts</p>
            </div>
        </div>
        
        <!-- Search & Filter Controls -->
        <div class="smart-card mb-6">
            <div class="flex flex-wrap gap-4 items-center">
                <input id="search-term" placeholder="Search by name, email, or school..." class="smart-input flex-1 min-w-[220px]">
                <select id="filter-batch" class="smart-input w-auto">
                    <option value="">All Batches</option>
                    <option value="2026 A/L">2026 A/L</option>
                    <option value="2027 A/L">2027 A/L</option>
                    <option value="2028 A/L">2028 A/L</option>
                    <option value="2029 A/L">2029 A/L</option>
                </select>
            </div>
        </div>

        <!-- Student Table -->
        <div class="smart-card overflow-hidden p-0 mb-10">
            <div class="overflow-x-auto">
                <table class="smart-table">
                    <thead class="bg-[#0b0f19]">
                        <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>School</th>
                            <th>Batch</th>
                            <th>Phone</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="user-table-body">
                        <tr><td colspan="6" class="text-center p-8 text-gray-400">Loading student directory...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  `;

  // Fetch users directory
  const usersSnap = await getDocs(collection(db, 'users'));
  const allUsers = usersSnap.docs.map(dsc => ({ id: dsc.id, ...dsc.data() }));

  const totalUsersEl = document.getElementById('total-users-count');
  if (totalUsersEl) totalUsersEl.textContent = allUsers.length;

  // Track daily logins and active users
  const today = getLocalDateString();
  const dailyLoginQuery = query(
    collection(db, 'userActivity'),
    where('date', '==', today)
  );

  let currentDailyUsers = [];
  let currentActiveUsers = [];

  try {
    onSnapshot(dailyLoginQuery, (snapshot) => {
      currentDailyUsers = snapshot.docs.map(d => d.data());
      
      const uniqueDailyIds = new Set(currentDailyUsers.map(d => d.userId));
      const dailyEl = document.getElementById('daily-logins-count');
      if (dailyEl) dailyEl.textContent = uniqueDailyIds.size || 0;

      const updateActiveCount = () => {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        currentActiveUsers = currentDailyUsers.filter(d => d.lastActive > fiveMinutesAgo);
        const uniqueActiveIds = new Set(currentActiveUsers.map(d => d.userId));
        const activeEl = document.getElementById('active-users-count');
        if (activeEl) activeEl.textContent = uniqueActiveIds.size || 0;
      };

      updateActiveCount();
      if (window._adminStatsInterval) clearInterval(window._adminStatsInterval);
      window._adminStatsInterval = setInterval(updateActiveCount, 30000);
    }, (error) => {
      console.warn('Activity listener error:', error);
    });
  } catch (e) {
    console.warn(e);
  }

  const showUsersListModal = (title, userIds, allUsersData) => {
      if(userIds.length === 0) {
          showFloatingModal(`
            <h3 class="text-xl font-bold mb-4 text-[var(--text-primary)]">${escapeHTML(title)}</h3>
            <p class="text-sm text-[var(--text-secondary)]">No users found.</p>
            <button onclick="closeFloatingModal()" class="btn-ghost mt-6 w-full">Close</button>
          `);
          return;
      }
      
      const listHtml = userIds.map(uid => {
          const u = allUsersData.find(x => x.id === uid);
          if(!u) return '';
          const name = escapeHTML([u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unknown User');
          const email = escapeHTML(u.email || '');
          return `
            <div class="flex justify-between items-center bg-[var(--bg-root)] p-3 rounded-xl border border-[var(--glass-border)] mb-2">
               <div>
                  <p class="font-bold text-sm text-[var(--text-primary)]">${name}</p>
                  <p class="text-xs text-[var(--text-secondary)]">${email}</p>
               </div>
               <button onclick="viewUserDetail('${uid}')" class="btn-ghost text-xs py-1 px-3">View</button>
            </div>
          `;
      }).join('');
      
      showFloatingModal(`
          <div class="max-h-[60vh] flex flex-col">
              <h3 class="text-xl font-bold mb-4 text-[var(--text-primary)] border-b border-[var(--glass-border)] pb-2 flex justify-between items-center sticky top-0 bg-[var(--bg-secondary)] z-10 pr-10">
                  <span>${escapeHTML(title)}</span> 
                  <span class="bg-indigo-500/20 text-indigo-400 text-xs px-2.5 py-1 rounded-full">${userIds.length}</span>
              </h3>
              <div class="overflow-y-auto flex-1 pr-2 mb-4 custom-scrollbar">
                  ${listHtml}
              </div>
              <button onclick="closeFloatingModal()" class="btn-secondary w-full py-2 shadow-lg mt-2">Close</button>
          </div>
      `);
  };

  document.getElementById('active-users-card').onclick = () => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const activeIds = [...new Set(currentDailyUsers.filter(d => d.lastActive > fiveMinutesAgo).map(d => d.userId))];
      showUsersListModal("Currently Active Users (Last 5 mins)", activeIds, allUsers);
  };

  const renderTable = (usersToRender) => {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;
    if (usersToRender.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center p-8 text-gray-400">No matching student records found.</td></tr>';
      return;
    }

    tbody.innerHTML = usersToRender.map(u => {
        const displayName = escapeHTML([u.firstName, u.lastName].filter(Boolean).join(' ') || 'User Name');
        const email = escapeHTML(u.email || '-');
        const school = escapeHTML(u.school || '-');
        const examYear = escapeHTML(u.examYear || '-');
        const phone = escapeHTML(u.phone || '-');

        return `
            <tr>
                <td>
                    <div class="font-bold text-[var(--text-primary)]">${displayName}</div>
                </td>
                <td class="text-xs text-[var(--text-secondary)]">${email}</td>
                <td class="text-xs">${school}</td>
                <td><span class="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-1 rounded-full border border-indigo-500/20">${examYear}</span></td>
                <td class="text-xs text-[var(--text-secondary)]">${phone}</td>
                <td>
                    <div class="flex gap-2 flex-wrap">
                        <button onclick="viewUserDetail('${u.id}')" class="btn-ghost text-xs py-1 px-2.5">View</button>
                        <button onclick="openNotificationModal('${u.id}', '${displayName.replace(/'/g, "\\'")}')" class="btn-ghost text-xs py-1 px-2.5 text-indigo-400 hover:text-indigo-300">Notify</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
  };

  renderTable(allUsers);

  // Search and batch filter
  const filter = () => {
    const term = (document.getElementById('search-term')?.value || '').toLowerCase();
    const batch = document.getElementById('filter-batch')?.value || '';
    const filtered = allUsers.filter(u => {
      const matchName = (u.firstName || '').toLowerCase().includes(term) ||
                        (u.lastName || '').toLowerCase().includes(term) ||
                        (u.email || '').toLowerCase().includes(term) ||
                        (u.school || '').toLowerCase().includes(term);
      const matchBatch = batch ? u.examYear === batch : true;
      return matchName && matchBatch;
    });
    renderTable(filtered);
  };

  document.getElementById('search-term').oninput = filter;
  document.getElementById('filter-batch').onchange = filter;

  // View User Detail Modal
  window.viewUserDetail = async (uid) => {
    const u = allUsers.find(x => x.id === uid);
    if (!u) return;

    showFloatingModal(`
        <div class="flex items-center justify-center p-8">
            <div class="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    `);

    // Fetch study logs for charts
    let logs = [];
    try {
      const logQ = query(collection(db, 'studyLogs'), where('userId', '==', uid));
      const logSnap = await getDocs(logQ);
      logs = logSnap.docs.map(d => d.data());
    } catch (e) {
      console.warn("Could not load study logs:", e);
    }

    const totalHours = logs.reduce((a, b) => a + (Number(b.hours) || 0), 0);
    const displayName = escapeHTML([u.firstName, u.lastName].filter(Boolean).join(' ') || 'User Name');
    const isCurrentlyMod = u.role === 'moderator' || u.isModerator === true || NILANTHA_MODERATORS.includes(uid) || RAVINDU_MODERATORS.includes(uid);
    const isLectureEditor = u.canPostLectureHall === true || u.isLectureHallEditor === true;

    // Last 7 days weekly data
    const wLabels = [];
    const wValues = [];
    const todayDate = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(todayDate.getDate() - i);
        const ds = getLocalDateString(d);
        wLabels.push(d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
        const entry = logs.find(x => x.date === ds);
        wValues.push(entry ? (Number(entry.hours) || 0) : 0);
    }

    // Monthly data
    const mData = {};
    logs.forEach(d => {
        if (d.date) {
            const k = d.date.slice(0, 7);
            mData[k] = (mData[k] || 0) + (Number(d.hours) || 0);
        }
    });
    const mLabels = Object.keys(mData).sort();
    const mValues = mLabels.map(k => mData[k]);

    const photoSrc = sanitizeUrl(u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent([u.firstName, u.lastName].filter(Boolean).join(' ') || 'User')}&background=4f46e5&color=fff`);

    showFloatingModal(`
        <div class="text-center w-full max-w-lg mx-auto">
            <div class="flex justify-between items-start mb-4">
                 <div class="w-16 h-16 rounded-full bg-slate-700 overflow-hidden border-2 border-indigo-500 shrink-0 shadow-md">
                      <img src="${photoSrc}" class="w-full h-full object-cover">
                 </div>
                 <div class="text-left ml-4 flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                           <h3 class="text-xl font-bold text-[var(--text-primary)]">${displayName}</h3>
                           ${isCurrentlyMod ? '<span class="badge-moderator">🛡️ MODERATOR</span>' : ''}
                           ${isLectureEditor ? '<span class="badge-lecture-editor">📚 LECTURE EDITOR</span>' : ''}
                      </div>
                      <p class="text-sm text-[var(--text-secondary)]">${escapeHTML(u.email || '-')}</p>
                 </div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 text-left bg-[var(--bg-root)] p-4 rounded-xl border border-[var(--glass-border)] text-sm">
                <div><p class="text-[0.65rem] text-[var(--text-secondary)] uppercase">Batch</p><p class="font-bold truncate">${escapeHTML(u.examYear || '-')}</p></div>
                <div><p class="text-[0.65rem] text-[var(--text-secondary)] uppercase">School</p><p class="font-bold truncate">${escapeHTML(u.school || '-')}</p></div>
                <div><p class="text-[0.65rem] text-[var(--text-secondary)] uppercase">Phone</p><p class="font-bold truncate">${escapeHTML(u.phone || '-')}</p></div>
                <div><p class="text-[0.65rem] text-[var(--text-secondary)] uppercase">Birthday</p><p class="font-bold truncate">${escapeHTML(u.birthday || '-')}</p></div>
                <div><p class="text-[0.65rem] text-[var(--text-secondary)] uppercase">Joined</p><p class="font-bold truncate">${u.createdAt ? escapeHTML(new Date(u.createdAt).toLocaleDateString()) : '-'}</p></div>
                <div><p class="text-[0.65rem] text-[var(--text-secondary)] uppercase">Total Study</p><p class="font-bold text-indigo-400">${totalHours.toFixed(1)} Hrs</p></div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-[var(--bg-root)] p-3 rounded-xl border border-[var(--glass-border)]">
                    <h4 class="text-xs font-bold text-left text-[var(--text-secondary)] uppercase mb-2">Last 7 Days</h4>
                    <div class="h-28 w-full"><canvas id="admin-user-chart-weekly"></canvas></div>
                </div>
                <div class="bg-[var(--bg-root)] p-3 rounded-xl border border-[var(--glass-border)]">
                    <h4 class="text-xs font-bold text-left text-[var(--text-secondary)] uppercase mb-2">Monthly</h4>
                    <div class="h-28 w-full"><canvas id="admin-user-chart-monthly"></canvas></div>
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                 <button onclick="closeFloatingModal()" class="btn-ghost w-full text-xs">Close</button>
                 <button onclick="window.toggleUserModerator('${uid}', ${!isCurrentlyMod})" class="${isCurrentlyMod ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40'} py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer">
                     ${isCurrentlyMod ? 'Revoke Mod 🛡️' : 'Make Mod 🛡️'}
                 </button>
                 <button onclick="window.toggleLectureHallEditor('${uid}', ${!isLectureEditor})" class="${isLectureEditor ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/40' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'} py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer">
                     ${isLectureEditor ? 'Revoke Lecture 📚' : 'Grant Lecture 📚'}
                 </button>
                 <button onclick="window.deleteUser('${uid}')" class="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer">Delete</button>
            </div>
        </div>
    `);

    setTimeout(() => {
        const ctxW = document.getElementById('admin-user-chart-weekly');
        if (ctxW && window.Chart) {
            new window.Chart(ctxW.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: wLabels,
                    datasets: [{ label: 'Hours', data: wValues, backgroundColor: '#4f46e5', borderRadius: 4 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { font: { size: 9 }, color: '#94a3b8' } }, x: { ticks: { font: { size: 9 }, color: '#94a3b8' } } }
                }
            });
        }
        const ctxM = document.getElementById('admin-user-chart-monthly');
        if (ctxM && window.Chart) {
            new window.Chart(ctxM.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: mLabels,
                    datasets: [{ label: 'Hours', data: mValues, backgroundColor: '#06b6d4', borderRadius: 4 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { font: { size: 9 }, color: '#94a3b8' } }, x: { ticks: { font: { size: 9 }, color: '#94a3b8' } } }
                }
            });
        }
    }, 100);
  };

  window.deleteUser = async (uid) => {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      alert("User account deleted successfully.");
      closeFloatingModal();
      renderAdmin(user);
    } catch (e) {
      alert("Error deleting user: " + e.message);
    }
  };

  window.toggleUserModerator = async (uid, makeMod) => {
    const actionText = makeMod ? "appoint as Moderator" : "remove Moderator privileges from";
    if (!confirm(`Are you sure you want to ${actionText} this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        isModerator: makeMod,
        role: makeMod ? 'moderator' : 'student',
        updatedAt: Date.now()
      });
      alert(makeMod ? "User appointed as Moderator successfully!" : "Moderator privileges removed successfully!");
      closeFloatingModal();
      renderAdmin(user);
    } catch (e) {
      alert("Failed to update role: " + e.message);
    }
  };

  window.toggleLectureHallEditor = async (uid, grant) => {
    const actionText = grant ? "grant Lecture Hall Text + Link posting access to" : "remove Lecture Hall posting access from";
    if (!confirm(`Are you sure you want to ${actionText} this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        canPostLectureHall: grant,
        isLectureHallEditor: grant,
        updatedAt: Date.now()
      });

      try {
        const settingsRef = doc(db, 'settings', 'lecture_hall_permissions');
        const snap = await getDoc(settingsRef);
        let editors = snap.exists() && Array.isArray(snap.data().editors) ? snap.data().editors : [];
        if (grant) {
          if (!editors.includes(uid)) editors.push(uid);
        } else {
          editors = editors.filter(id => id !== uid);
        }
        await setDoc(settingsRef, { editors, updatedAt: Date.now() }, { merge: true });
      } catch (err) {
        console.warn("Could not sync settings/lecture_hall_permissions:", err);
      }

      alert(grant ? "Granted Lecture Hall Editor access!" : "Removed Lecture Hall Editor access!");
      closeFloatingModal();
      renderAdmin(user);
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  window.openNotificationModal = (uid, name) => {
    showFloatingModal(`
      <h3 class="text-xl font-bold text-[var(--text-primary)] mb-4">Send Alert to ${escapeHTML(name)} 🔔</h3>
      <form id="notification-form" class="space-y-4">
          <input name="title" placeholder="Title (e.g. Class Update)" class="smart-input" required>
          <textarea name="message" placeholder="Type your message here..." class="smart-input min-h-[100px]" required></textarea>
          <button type="submit" class="btn-primary w-full py-3">Send Notification</button>
      </form>
    `);

    document.getElementById('notification-form').onsubmit = async (e) => {
      e.preventDefault();
      const title = sanitizeInput((e.target.title.value || '').trim());
      const msg = sanitizeInput((e.target.message.value || '').trim());
      const success = await sendNotification(uid, title, msg);
      if (success === true) {
        alert("Notification sent successfully!");
        closeFloatingModal();
      } else {
        alert("Failed to send notification: " + (success.message || "Unknown Error"));
      }
    };
  };

  window.openBroadcastModal = () => {
    showFloatingModal(`
      <h3 class="text-xl font-bold text-[var(--text-primary)] mb-2">Broadcast to ALL Users 📢</h3>
      <p class="text-red-400 text-xs mb-4">Warning: This will create a push notification in every registered student's account.</p>
      <form id="broadcast-form" class="space-y-4">
          <input name="title" placeholder="Title (e.g. Urgent Class Announcement)" class="smart-input" required>
          <textarea name="message" placeholder="Type your message here..." class="smart-input min-h-[100px]" required></textarea>
          <button type="submit" class="btn-primary w-full py-3 bg-red-600 hover:bg-red-700">Send Broadcast</button>
      </form>
    `);

    document.getElementById('broadcast-form').onsubmit = async (e) => {
      e.preventDefault();
      if (!confirm("Are you sure you want to broadcast this to all registered students?")) return;

      const title = sanitizeInput((e.target.title.value || '').trim());
      const msg = sanitizeInput((e.target.message.value || '').trim());

      const success = await broadcastNotification(title, msg);
      if (success) {
        alert("Broadcast sent successfully!");
        closeFloatingModal();
      } else {
        alert("Failed to send broadcast.");
      }
    };
  };

  window.openGlobalPopupModal = () => {
    showFloatingModal(`
      <h3 class="text-xl font-bold text-[var(--text-primary)] mb-2">Create Global Pop-up 📣</h3>
      <p class="text-[var(--text-secondary)] text-xs mb-4">This will pop up for every student upon their next app launch. Dismissed once seen.</p>
      <form id="global-popup-form" class="space-y-4">
          <input name="title" placeholder="Title (e.g. New Year Special Announcement!)" class="smart-input" required>
          <textarea name="message" placeholder="Type announcement details here..." class="smart-input min-h-[100px]" required></textarea>
          <button type="submit" class="btn-primary w-full py-3 bg-emerald-600 hover:bg-emerald-700">Publish Global Pop-up</button>
      </form>
    `);

    document.getElementById('global-popup-form').onsubmit = async (e) => {
      e.preventDefault();
      if (!confirm("Set this as the active Global Pop-up?")) return;

      const title = sanitizeInput((e.target.title.value || '').trim());
      const msg = sanitizeInput((e.target.message.value || '').trim());

      try {
        await addDoc(collection(db, 'global_notifications'), {
          title: title,
          message: msg,
          timestamp: Date.now(),
          active: true
        });
        alert("Global Pop-up created successfully!");
        closeFloatingModal();
      } catch (err) {
        alert("Failed to create Global Pop-up: " + err.message);
      }
    };
  };

  window.openVikumResourcesModal = async () => {
    let currentLink = 'https://drive.google.com/drive/folders/1nQSEX2Q5cPhu-YsMpQUKWQuRh-0vqZ-G?usp=drive_link';
    try {
      const docRef = doc(db, 'settings', 'vikum_resources');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().link) {
        currentLink = docSnap.data().link;
      }
    } catch (e) {
      console.warn(e);
    }

    showFloatingModal(`
        <h3 class="text-xl font-bold text-[var(--text-primary)] mb-2">Vikum Harshana Resources Link 🔗</h3>
        <p class="text-[var(--text-secondary)] text-xs mb-4">Update the external resources drive/telegram link for Vikum Harshana Supportive Classes.</p>
        <form id="vikum-resources-form" class="space-y-4">
            <input name="link" placeholder="Enter link (e.g. https://...)" class="smart-input" value="${escapeHTML(currentLink)}" required>
            <button type="submit" class="btn-primary w-full py-3 bg-purple-600 hover:bg-purple-700">Update Resources Link</button>
        </form>
    `);

    document.getElementById('vikum-resources-form').onsubmit = async (e) => {
      e.preventDefault();
      const rawLink = (e.target.link.value || '').trim();
      const link = sanitizeUrl(rawLink);
      try {
        await setDoc(doc(db, 'settings', 'vikum_resources'), { link, updatedAt: Date.now() }, { merge: true });
        alert("Resources link updated successfully!");
        closeFloatingModal();
      } catch (err) {
        alert("Failed to update link: " + err.message);
      }
    };
  };

  window.openEmailRequestsModal = async () => {
      showFloatingModal(`<h3 class="text-xl font-bold mb-4">Loading Email Requests...</h3>`);
      
      try {
          const q = query(collection(db, 'emailRequests'), where('status', '==', 'pending'));
          const snap = await getDocs(q);
          
          if (snap.empty) {
              showFloatingModal(`
                  <h3 class="text-xl font-bold text-[var(--text-primary)] mb-4">Email Change Requests 📧</h3>
                  <p class="text-[var(--text-secondary)] py-8 text-center text-sm">No pending email change requests.</p>
                  <button onclick="closeFloatingModal()" class="btn-ghost w-full">Close</button>
              `);
              return;
          }
          
          const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          const listHtml = reqs.map(r => `
              <div class="bg-[var(--bg-root)] p-4 rounded-xl border border-[var(--glass-border)] mb-3">
                  <p class="font-bold text-sm mb-1">${escapeHTML(r.userName || 'Unknown User')}</p>
                  <p class="text-xs text-[var(--text-secondary)] mb-3">Current: <span class="text-[var(--text-primary)]">${escapeHTML(r.currentEmail)}</span> ➡️ New: <span class="text-indigo-400 font-bold">${escapeHTML(r.newEmail)}</span></p>
                  <div class="flex gap-2">
                      <button onclick="window.approveEmailReq('${r.id}')" class="btn-primary text-xs py-1 px-3 bg-emerald-500 hover:bg-emerald-600">Approve</button>
                      <button onclick="window.rejectEmailReq('${r.id}')" class="btn-ghost text-xs py-1 px-3 text-red-400 hover:bg-red-500/10 border-none">Reject</button>
                  </div>
              </div>
          `).join('');
          
          showFloatingModal(`
              <div class="max-h-[70vh] flex flex-col">
                  <h3 class="text-xl font-bold mb-4 text-[var(--text-primary)] flex justify-between items-center sticky top-0 bg-[var(--bg-secondary)] z-10 pb-2 border-b border-[var(--glass-border)]">
                      <span>Email Requests 📧</span> 
                      <span class="bg-indigo-500/20 text-indigo-400 text-xs px-2.5 py-1 rounded-full">${reqs.length}</span>
                  </h3>
                  <div class="overflow-y-auto flex-1 pr-2 mb-4 custom-scrollbar">
                      ${listHtml}
                  </div>
                  <button onclick="closeFloatingModal()" class="btn-secondary w-full py-2 shadow-lg mt-2">Close</button>
              </div>
          `);
      } catch (error) {
          showFloatingModal(`
              <h3 class="text-xl font-bold text-red-500 mb-4">Error</h3>
              <p class="text-[var(--text-secondary)] mb-4 text-xs">${escapeHTML(error.message)}</p>
              <button onclick="closeFloatingModal()" class="btn-ghost w-full">Close</button>
          `);
      }
  };

  window.approveEmailReq = async (id) => {
      if (!confirm("Approve this email change request?")) return;
      await updateDoc(doc(db, 'emailRequests', id), { status: 'approved' });
      window.openEmailRequestsModal();
  };
  
  window.rejectEmailReq = async (id) => {
      if (!confirm("Reject this email change request?")) return;
      await updateDoc(doc(db, 'emailRequests', id), { status: 'rejected' });
      window.openEmailRequestsModal();
  };

  // Contact Messages Admin View
  window.openContactMessagesModal = async () => {
      showFloatingModal(`
          <h3 class="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><span>💬</span> Student Inquiries & Messages</h3>
          <div id="contact-messages-container" class="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <p class="text-center text-[var(--text-secondary)] py-8 text-sm">Loading messages...</p>
          </div>
          <button onclick="closeFloatingModal()" class="btn-ghost shadow-lg mt-6 w-full">Close</button>
      `);

      try {
          const q = query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'));
          const snap = await getDocs(q);
          const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));

          const container = document.getElementById('contact-messages-container');
          if (!container) return;

          if (messages.length === 0) {
              container.innerHTML = '<p class="text-center text-[var(--text-secondary)] py-8 text-sm">No contact messages found.</p>';
              return;
          }

          container.innerHTML = messages.map(msg => {
              let waNumber = (msg.whatsapp || '').replace(/[^0-9]/g, '');
              if (waNumber.startsWith('0') && waNumber.length === 10) {
                  waNumber = '94' + waNumber.substring(1);
              }
              const safeEmail = escapeHTML(msg.email || '');
              const safeMsg = escapeHTML(msg.message || '');
              const dateStr = msg.createdAt ? escapeHTML(new Date(msg.createdAt).toLocaleString()) : '-';
              
              return `
              <div class="p-4 bg-[var(--bg-root)] border border-[var(--glass-border)] rounded-xl relative group">
                  <div class="flex justify-between items-start mb-3">
                      <div>
                          <p class="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                              <span>📧</span>
                              <a href="mailto:${safeEmail}" class="hover:text-indigo-400 hover:underline transition-colors">${safeEmail}</a>
                          </p>
                          <p class="text-[0.65rem] text-[var(--text-secondary)] opacity-70 mt-1">${dateStr}</p>
                      </div>
                      ${waNumber ? `
                        <a href="https://wa.me/${waNumber}?text=${encodeURIComponent('Hello! Replying to your inquiry on StudyTracker Pro: ')}" target="_blank" rel="noopener noreferrer" class="bg-[#25D366]/20 text-[#25D366] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#25D366] hover:text-white transition-all flex items-center gap-1.5 shadow-sm">
                            <span>WhatsApp</span>
                            <span>${escapeHTML(msg.whatsapp)}</span>
                        </a>
                      ` : ''}
                  </div>
                  <div class="text-xs text-[var(--text-primary)] whitespace-pre-wrap bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--glass-border)] break-words">${safeMsg}</div>
                  
                  <button onclick="window.deleteContactMessage('${msg.id}')" class="absolute top-2 right-2 invisible group-hover:visible bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer" title="Delete Message">
                      ✕
                  </button>
              </div>
          `}).join('');
      } catch(e) {
          document.getElementById('contact-messages-container').innerHTML = `<p class="text-center text-red-400 py-8 text-sm">Failed to load messages: ${escapeHTML(e.message)}</p>`;
      }
  };

  window.deleteContactMessage = async (id) => {
      if (!confirm('Are you sure you want to delete this message?')) return;
      try {
          await deleteDoc(doc(db, 'contactMessages', id));
          window.openContactMessagesModal();
      } catch(e) {
          alert('Failed to delete message: ' + e.message);
      }
  };

  window.openLectureHallPermissionsModal = async () => {
    let currentUsers = allUsers;
    try {
      const snap = await getDocs(collection(db, 'users'));
      currentUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      console.warn("Using cached allUsers:", e);
    }

    const contributors = currentUsers.filter(u => u.canPostLectureHall === true || u.isLectureHallEditor === true);

    showFloatingModal(`
        <div class="space-y-4">
            <div class="flex items-center gap-3 pb-3 border-b border-[var(--glass-border)]">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl shadow-md">
                    📚
                </div>
                <div>
                    <h3 class="font-bold text-base text-[var(--text-primary)]">Lecture Hall Permissions Management</h3>
                    <p class="text-xs text-[var(--text-secondary)]">Appoint contributors who can post video links & titles</p>
                </div>
            </div>

            <div class="p-4 rounded-xl bg-[var(--bg-root)] border border-[var(--glass-border)]">
                <h4 class="text-xs uppercase font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                    <span>➕</span> Appoint New Contributor
                </h4>
                <div class="relative">
                    <input id="lh-user-search-input" type="text" placeholder="Search student by name or email..." class="smart-input text-xs sm:text-sm">
                    <div id="lh-search-results" class="hidden absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] shadow-xl p-1 space-y-1 custom-scrollbar"></div>
                </div>
            </div>

            <div>
                <h4 class="text-xs uppercase font-bold text-[var(--text-secondary)] mb-3">
                    Current Contributors (${contributors.length})
                </h4>

                ${contributors.length === 0 ? `
                    <p class="text-center py-6 text-xs text-[var(--text-secondary)]">No separate contributors appointed yet.</p>
                ` : `
                    <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                        ${contributors.map(u => {
                          const fullName = escapeHTML([u.firstName, u.lastName].filter(Boolean).join(' ') || 'User');
                          return `
                            <div class="p-3 rounded-xl bg-[var(--bg-root)] border border-[var(--glass-border)] flex items-center justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="text-xs font-bold text-[var(--text-primary)] truncate">${fullName}</p>
                                    <p class="text-[10px] text-[var(--text-secondary)] truncate">${escapeHTML(u.email || '')}</p>
                                </div>
                                <button onclick="window.toggleLectureHallEditor('${u.id}', false)" class="btn-ghost py-1 px-2.5 text-xs text-red-400 hover:bg-red-500/10 border-red-500/30">
                                    Revoke ✕
                                </button>
                            </div>
                          `;
                        }).join('')}
                    </div>
                `}
            </div>

            <button onclick="closeFloatingModal()" class="btn-primary w-full py-2.5 text-xs font-bold">Done</button>
        </div>
    `);

    const searchInput = document.getElementById('lh-user-search-input');
    const resultsContainer = document.getElementById('lh-search-results');

    if (searchInput && resultsContainer) {
      searchInput.oninput = () => {
        const queryVal = (searchInput.value || '').toLowerCase().trim();
        if (!queryVal) {
          resultsContainer.classList.add('hidden');
          resultsContainer.innerHTML = '';
          return;
        }

        const matches = currentUsers.filter(u => {
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase();
          const email = (u.email || '').toLowerCase();
          return (name.includes(queryVal) || email.includes(queryVal)) && !u.canPostLectureHall;
        }).slice(0, 6);

        if (matches.length === 0) {
          resultsContainer.innerHTML = `<div class="p-3 text-center text-xs text-[var(--text-secondary)]">No eligible users found</div>`;
          resultsContainer.classList.remove('hidden');
          return;
        }

        resultsContainer.innerHTML = matches.map(m => {
          const mName = escapeHTML([m.firstName, m.lastName].filter(Boolean).join(' ') || m.email);
          return `
            <div class="p-2.5 rounded-lg hover:bg-white/10 flex items-center justify-between gap-2 cursor-pointer transition-colors" data-uid="${m.id}">
                <div class="min-w-0">
                    <p class="text-xs font-bold text-[var(--text-primary)] truncate">${mName}</p>
                    <p class="text-[10px] text-[var(--text-secondary)] truncate">${escapeHTML(m.email)}</p>
                </div>
                <button type="button" class="btn-primary text-[10px] py-1 px-2 bg-amber-600 hover:bg-amber-500 rounded-lg">
                    Appoint ➕
                </button>
            </div>
          `;
        }).join('');

        resultsContainer.querySelectorAll('[data-uid]').forEach(el => {
          el.onclick = async () => {
            const appointUid = el.getAttribute('data-uid');
            resultsContainer.classList.add('hidden');
            searchInput.value = '';
            await window.toggleLectureHallEditor(appointUid, true);
          };
        });

        resultsContainer.classList.remove('hidden');
      };
    }
  };

  window.fixUserNames = async () => {
    if (!confirm("Are you sure you want to fix all user names where First Name contains both First and Last names?")) return;
    let count = 0;
    try {
        for (const u of allUsers) {
            if (u.firstName && u.firstName.includes(' ') && (!u.lastName || u.lastName.trim() === '')) {
                const parts = u.firstName.trim().split(' ');
                const fName = parts[0];
                const lName = parts.slice(1).join(' ');
                await setDoc(doc(db, 'users', u.id), { firstName: fName, lastName: lName }, { merge: true });
                count++;
            }
        }
        alert(count === 0 ? "No users found needing a name fix." : `Successfully fixed ${count} users!`);
        renderAdmin(user);
    } catch(e) {
        alert("Failed: " + e.message);
    }
  };

  window.openDailyLoginsModal = async (selectedDate) => {
      const todayDate = getLocalDateString();
      const dateToUse = selectedDate || todayDate;

      showFloatingModal(`
          <div class="max-h-[60vh] flex flex-col">
              <div class="flex justify-between items-center mb-4 sticky top-0 bg-[var(--bg-secondary)] z-10 pb-2 border-b border-[var(--glass-border)] pr-8">
                  <h3 class="text-lg font-bold text-[var(--text-primary)]">Daily Visitors</h3>
                  <input type="date" id="daily-login-date" value="${dateToUse}" class="smart-input w-auto text-xs py-1 px-2">
              </div>
              <div id="daily-logins-list-container" class="overflow-y-auto flex-1 pr-2 mb-4 custom-scrollbar">
                  <p class="text-center text-xs text-[var(--text-secondary)] py-8">Loading visitors...</p>
              </div>
              <button onclick="closeFloatingModal()" class="btn-secondary w-full py-2 shadow-lg">Close</button>
          </div>
      `);

      const loadData = async (dateStr) => {
          const listContainer = document.getElementById('daily-logins-list-container');
          if(!listContainer) return;
          listContainer.innerHTML = '<p class="text-xs text-[var(--text-secondary)] text-center py-4">Loading data...</p>';
          
          try {
              const q = query(collection(db, 'userActivity'), where('date', '==', dateStr));
              const snap = await getDocs(q);
              
              if(snap.empty) {
                  listContainer.innerHTML = `<p class="text-xs text-[var(--text-secondary)] text-center py-8">No logins recorded for ${escapeHTML(dateStr)}.</p>`;
                  return;
              }
              
              const activities = snap.docs.map(d => d.data());
              const listHtml = activities.map(act => {
                  const u = allUsers.find(x => x.id === act.userId);
                  if(!u) return '';
                  const name = escapeHTML([u.firstName, u.lastName].filter(Boolean).join(' ') || 'Unknown User');
                  const email = escapeHTML(u.email || '-');
                  
                  return `
                      <div class="bg-[var(--bg-root)] p-3 rounded-xl border border-[var(--glass-border)] mb-2">
                         <div class="flex justify-between items-start">
                             <div>
                                 <p class="font-bold text-xs text-[var(--text-primary)]">${name}</p>
                                 <p class="text-[10px] text-[var(--text-secondary)]">${email}</p>
                             </div>
                             <button onclick="viewUserDetail('${act.userId}')" class="btn-ghost text-[10px] py-1 px-2">Profile</button>
                         </div>
                      </div>
                  `;
              }).join('');
              
              listContainer.innerHTML = listHtml;
          } catch(e) {
              listContainer.innerHTML = '<p class="text-xs text-red-400 text-center py-4">Error loading data.</p>';
          }
      };

      await loadData(dateToUse);

      const dateInput = document.getElementById('daily-login-date');
      if(dateInput) {
          dateInput.onchange = (e) => loadData(e.target.value);
      }
  };

  document.getElementById('daily-logins-card').onclick = () => {
      window.openDailyLoginsModal(getLocalDateString());
  };
}

