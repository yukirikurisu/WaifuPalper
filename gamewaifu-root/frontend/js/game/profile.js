document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    // activar botón
    document.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    // mostrar panel
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(tc=>tc.classList.add('hidden'));
    document.getElementById(`${tab}-tab`).classList.remove('hidden');
    // cargar datos si es missions o achievements
    if (tab === 'missions') loadMissions();
    if (tab === 'achievements') loadAchievements();
  });
});

async function loadMissions() {
  const ul = document.getElementById('missions-list');
  if (ul.dataset.loaded) return;
  try {
    const res = await fetch('/api/profile/missions');
    const missions = await res.json();
    missions.forEach(m => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${m.name}</strong> — ${m.description}  
        <progress max="${m.goal}" value="${m.progress}"></progress>
        ${m.is_completed ? '<span>✔️ Completada</span>' : ''}
      `;
      ul.appendChild(li);
    });
    ul.dataset.loaded = 'true';
  } catch (err) { console.error(err); }
}

async function loadAchievements() {
  const ul = document.getElementById('achievements-list');
  if (ul.dataset.loaded) return;
  try {
    const res = await fetch('/api/profile/achievements');
    const achievements = await res.json();
    achievements.forEach(a => {
      const li = document.createElement('li');
      li.innerHTML = `
        <img src="${a.icon_url}" alt="${a.name}" width="32" height="32">
        <strong>${a.name}</strong> — ${a.description}
        <em>(${new Date(a.unlocked_at).toLocaleDateString()})</em>
      `;
      ul.appendChild(li);
    });
    ul.dataset.loaded = 'true';
  } catch (err) { console.error(err); }
}
