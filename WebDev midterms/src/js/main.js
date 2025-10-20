/*
  main.js — handles client-side routing, fake auth, posts in localStorage
  Keys stored:
    - Amielverse_users (object of users)
    - Amielverse_posts (array of posts)
    - Amielverse_currentUser (string username)
*/

(function () {
  // ---------------- Utilities ----------------
  function el(q) { return document.querySelector(q); }
  function els(q) { return Array.from(document.querySelectorAll(q)); }

  const STORE = {
    usersKey: 'Amielverse_users',
    postsKey: 'Amielverse_posts',
    currentKey: 'Amielverse_currentUser'
  };

  const BRAINROT_KEYWORDS = ["Skibidi","skibidi","toilet","gyatt","mewing","mew","rizz","rizzing",
    "rizzler","sigma","Ohio","bussin’","cook","cooking","let","him/her","baddie",
    "fanum","tax","drake","nonchalant","aura","grimace","shake","edging","edge",
    "goon","gooning","looksmaxing","alpha","griddy","baby","gronk","diddy",
    "Qaundale","dingle","Sus","sussy","imposter","among","us","Reese’s","pieces",
    "life","saver","gummies","meme","devious","Ei","ei","ratio","L","bozo","brain",
    "rot","ishowspeed/ishowmeat","bing","chilling","bomboclat","mog","mogging",
    "yap","yapping","yapper","goonmaxing","Freddy","fazbear","Kai","cenat","oil"];

  function containsBrainrot(text){
    const lower = text.toLowerCase();
    return BRAINROT_KEYWORDS.some(word => lower.includes(word));
  }

  function go(page) {
    const base = location.pathname.includes('/pages/') ? '' : 'pages/';
    location.href = base + page;
  }

  function readJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } 
    catch (e) { return fallback; }
  }

  function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function genId() { return 'p_' + Math.random().toString(36).slice(2, 9); }

  function currentUser() { return localStorage.getItem(STORE.currentKey); }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                   .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function escapeHtmlAttr(s) { return escapeHtml(s); }

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  // ---------------- Seed data ----------------
  function ensureSeed() {
    // Seed posts
    let posts = readJSON(STORE.postsKey, null);
    if (!posts) {
      posts = [
        { id: genId(), user:'alice', display:'Alice L', avatar:'../assets/img/defaultpfp.png',
          text:'Welcome to Amielverse! This feed is simulated.', likes:3, ts: Date.now()-3600000 },
        { id: genId(), user:'bob', display:'Bob', avatar:'../assets/img/defaultpfp.png',
          text:'Posting brainrot? We reduce you to atoms 😉', likes:1, ts: Date.now()-1800000 }
      ];
      writeJSON(STORE.postsKey, posts);
    }

    // Seed users
    let users = readJSON(STORE.usersKey, null);
    if (!users) {
      users = {
        alice: { username:'alice', password:'password', display:'Alice L', avatar:'../assets/img/defaultpfp.png', following:['bob'] },
        bob: { username:'bob', password:'password', display:'Bob', avatar:'../assets/img/defaultpfp.png', following:[] }
      };
      writeJSON(STORE.usersKey, users);
    }
  }

  // ---------------- Auth ----------------
  function requireAuth() {
    const path = location.pathname;
    if ((/feed.html|profile.html/).test(path) && !currentUser()) go('login.html');
  }

  function handleLogin() {
    const form = el('#loginForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const username = el('#loginUsername').value.trim();
      const password = el('#loginPassword').value;
      const users = readJSON(STORE.usersKey, {});
      const err = el('#loginError');
      if (users[username] && users[username].password === password) {
        localStorage.setItem(STORE.currentKey, username);
        go('feed.html');
      } else if (err) err.textContent = 'Incorrect username or password.';
    });
  }

  function handleSignup() {
    const form = el('#signupForm');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const username = el('#signupUsername').value.trim();
      const password = el('#signupPassword').value;
      const displayInput = el('#signupDisplay');
      const display = displayInput && displayInput.value.trim() ? displayInput.value.trim() : username;
      if (!username || !password) return;
      const users = readJSON(STORE.usersKey, {});
      const msg = el('#signupMsg');
      if (users[username]) { if (msg) msg.textContent = 'Username already exists.'; return; }
      users[username] = { username, password, display };
      writeJSON(STORE.usersKey, users);
      localStorage.setItem(STORE.currentKey, username);
      go('feed.html');
    });
  }

  // ---------------- Feed ----------------
  function renderFeed() {
    const feedEl = el('#feed'); if(!feedEl) return;
    let posts = readJSON(STORE.postsKey, []).slice().sort((a,b)=>b.ts-a.ts);
    const current = currentUser();
    feedEl.innerHTML = '';

    posts.forEach(p=>{
      const node = document.createElement('article');
      node.className='post';
      node.innerHTML = `
        <div class="meta">
          <img class="avatar" src="${escapeHtmlAttr(p.avatar)}" alt="avatar">
          <div>
            <strong>${escapeHtml(p.display||p.user)}</strong>
            <div class="muted tiny">@${escapeHtml(p.user)} · ${timeAgo(p.ts)}</div>
          </div>
        </div>
        <p>${escapeHtml(p.text)}</p>
        ${p.image ? `<img class="post-img" src="${escapeHtmlAttr(p.image)}" alt="post image">` : ''}
        <div class="actions">
          <button class="btn like-btn" data-id="${escapeHtmlAttr(p.id)}">Like (${p.likes||0})</button>
          <a class="btn ghost" href="profile.html?user=${encodeURIComponent(p.user)}">View profile</a>
          ${p.user===current?`
            <button class="btn edit-btn" data-id="${p.id}">Edit</button>
            <button class="btn delete-btn" data-id="${p.id}">Delete</button>`:''}
        </div>`;
      feedEl.appendChild(node);
    });

    els('.like-btn').forEach(b=>b.addEventListener('click', e=>toggleLike(e.currentTarget.dataset.id)));
    els('.delete-btn').forEach(b=>b.addEventListener('click', e=>deletePost(e.currentTarget.dataset.id)));
    els('.edit-btn').forEach(b=>b.addEventListener('click', e=>editPost(e.currentTarget.dataset.id)));
  }

  function editPost(postId){
    const posts = readJSON(STORE.postsKey, []);
    const post = posts.find(p=>p.id===postId);
    if(!post) return;
    const newText = prompt('Edit your post:', post.text);
    if(newText!==null && newText.trim()!==''){
      post.text = newText.trim();
      writeJSON(STORE.postsKey, posts);
      renderFeed();
    }
  }

  function deletePost(postId){
    if(!confirm('Are you sure you want to delete this post?')) return;
    let posts = readJSON(STORE.postsKey, []).filter(p=>p.id!==postId);
    writeJSON(STORE.postsKey, posts);
    renderFeed();
  }

  function toggleLike(postId) {
    const posts = readJSON(STORE.postsKey, []);
    const p = posts.find(x => x.id === postId);
    if (!p) return;

    const current = currentUser(); // whoever is logged in
    if (!current) return;

    // Make sure we have a likedBy array
    if (!p.likedBy) p.likedBy = [];

    // Toggle like
    if (p.likedBy.includes(current)) {
      // Already liked → unlike it
      p.likedBy = p.likedBy.filter(u => u !== current);
    } else {
      // Not yet liked → add like
      p.likedBy.push(current);
    }

    // Update like count
    p.likes = p.likedBy.length;

    // Save and re-render
    writeJSON(STORE.postsKey, posts);
    renderFeed();
  }

  // ---------------- Composer ----------------
  function handleComposer(){
    const form = el('#postForm'); if(!form) return;
    const ta = el('#postText'), cc=el('#charCount'), fileInput=el('#postImage'), preview=el('#imagePreview');
    ta&&ta.addEventListener('input', ()=>{cc.textContent=280-(ta.value||'').length;});
    fileInput && fileInput.addEventListener('change', () => {
      preview.innerHTML = '';
      const file = fileInput.files[0];
      if (file) {
        // Only allow images
        if (!file.type.startsWith('image/')) {
          alert('Please select an image file!');
          fileInput.value = '';
          return;
        }

        // Optional: limit file size (e.g., 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('Image is too large! Max 5MB.');
          fileInput.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = () => { 
          const img = document.createElement('img'); 
          img.src = reader.result; 
          preview.appendChild(img); 
        }; 
        reader.readAsDataURL(file); 
      }
    });
    form.addEventListener('submit', e=>{
      e.preventDefault();
      const text = ta.value.trim();
      const file = fileInput.files[0];
      const current = currentUser();
      const users = readJSON(STORE.usersKey, {});
      const display = (users[current]&&users[current].display)||current;
      if(!text&&!file) return;

      if(containsBrainrot(text)){
        alert("🚨 Brainrot detected! You shall be reduced to atoms!");
        ta.classList.add('atomize'); ta.value=''; preview.innerHTML=''; fileInput.value='';
        setTimeout(()=>ta.classList.remove('atomize'),800); return;
      }

      const savePost = (imageData)=>{
        const posts = readJSON(STORE.postsKey, []);
        const userAvatar = (users[current] && users[current].avatar) 
          ? users[current].avatar 
          : '../assets/img/defaultpfp.png';
        posts.push({ 
          id: genId(), 
          user: current, 
          display, 
          avatar: userAvatar, 
          text, 
          image: imageData || null, 
          likes: 0, 
          ts: Date.now() 
        });
        writeJSON(STORE.postsKey, posts);
        ta.value=''; fileInput.value=''; preview.innerHTML='';
        renderFeed();
      };

      if(file){
        // Only allow specific image extensions
        const allowed = ['png','jpg','jpeg','gif'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) {
          alert('Only PNG, JPG, or GIF images allowed!');
          fileInput.value = '';
          return;
        }

        // Optional: limit file size
        if (file.size > 10 * 1024 * 1024) {
          alert('Image is too large! Max 5MB.');
          fileInput.value = '';
          return;
        }

        const reader = new FileReader(); 
        reader.onload = () => savePost(reader.result); 
        reader.readAsDataURL(file); 
      } else savePost(null);
    });
  }

  // ---------------- Profile ----------------
  function renderProfile() {
    const users = readJSON(STORE.usersKey,{});
    const currentUsername = currentUser();
    const params = new URLSearchParams(location.search);
    const userParam = params.get('user');
    const userToShow = userParam||currentUsername;

    if(!users[userToShow]) users[userToShow]={username:userToShow,display:userToShow,avatar:'../assets/img/defaultpfp.png',following:[],followers:[]};
    if(!users[currentUsername]) users[currentUsername]={username:currentUsername,display:currentUsername,avatar:'../assets/img/defaultpfp.png',following:[],followers:[]};

    const profile = users[userToShow];
    const current = users[currentUsername];

    const dispEl = el('#profileDisplay'), handleEl = el('#profileHandle'), avatarEl = el('#profileAvatar'), postsEl = el('#profilePosts'), profileInput = el('#profileImageInput'), profileLabel = document.querySelector('label[for="profileImageInput"]'), followBtn = el('#followBtn');

    if(dispEl) dispEl.textContent = profile.display||profile.username;
    if(handleEl) handleEl.textContent = '@'+profile.username;
    if(avatarEl) avatarEl.src = profile.avatar||'../assets/img/defaultpfp.png';

    if(postsEl){
      const allPosts = readJSON(STORE.postsKey, []);
      const theirPosts = allPosts.filter(p=>p.user===userToShow).sort((a,b)=>b.ts-a.ts);
      postsEl.innerHTML = theirPosts.map(p=>`
        <article class="post">
          <div class="meta">
            <img class="avatar" src="${escapeHtmlAttr(p.avatar)}">
            <div>
              <strong>${escapeHtml(p.display||p.user)}</strong>
              <div class="muted tiny">@${escapeHtml(p.user)} · ${timeAgo(p.ts)}</div>
            </div>
          </div>
          <p>${escapeHtml(p.text)}</p>
          ${p.image ? `<img class="post-img" src="${escapeHtmlAttr(p.image)}" alt="post image">` : ''}
        </article>`).join('');
    }

    if (profileInput && profileLabel) {
      if (currentUsername === userToShow) {
        profileInput.style.display = 'block';
        profileLabel.style.display = 'inline-block';
        profileInput.onchange = () => {
          const file = profileInput.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const newAvatar = reader.result;

            avatarEl.src = newAvatar;
            profile.avatar = newAvatar;

            writeJSON(STORE.usersKey, users);

            const posts = readJSON(STORE.postsKey, []);
            posts.forEach(p => {
              if (p.user === currentUsername) p.avatar = newAvatar;
            });
            writeJSON(STORE.postsKey, posts);

            renderSidebar();
            renderFeed();
          };
          reader.readAsDataURL(file);
        };
      } else {
        profileInput.style.display = 'none';
        profileLabel.style.display = 'none';
      }
    }

    if(followBtn){
      if(currentUsername && currentUsername!==userToShow){
        followBtn.style.display='inline-block';
        if(!current.following) current.following=[];
        if(!profile.followers) profile.followers=[];
        followBtn.textContent=current.following.includes(userToShow)?'Unfollow':'Follow';
        followBtn.onclick = () => {
            if (current.following.includes(userToShow)) {
                // Unfollow
                current.following = current.following.filter(u => u !== userToShow);
                profile.followers = profile.followers.filter(u => u !== currentUser());
            } else {
                // Follow
                current.following.push(userToShow);
                profile.followers.push(currentUser());
            }

            // Save updated users
            writeJSON(STORE.usersKey, users);

            // Update button text
            followBtn.textContent = current.following.includes(userToShow) ? 'Unfollow' : 'Follow';

            // Update sidebar immediately
            renderSidebar();

            // Notify other parts of app
            document.dispatchEvent(new Event('followChanged'));
        };
      } else followBtn.style.display='none';
    }
  }

  // ---------------- Sidebar / Nav ----------------
  function renderSidebar(){
    const sidebarEl = el('#sidebarFriends'); if(!sidebarEl) return;
    const users = readJSON(STORE.usersKey,{});
    const current = users[currentUser()];
    if(!current||!current.following||current.following.length===0){
      sidebarEl.innerHTML='<p class="muted tiny">You are not following anyone yet.</p>'; return;
    }
    sidebarEl.innerHTML='';
    current.following.forEach(f=>{
      const user = users[f]; if(!user) return;
      const node=document.createElement('div'); node.className='friend';
      node.innerHTML=`
        <img class="avatar" src="${escapeHtmlAttr(user.avatar||'../assets/img/defaultpfp.png')}" alt="${escapeHtmlAttr(user.display)}">
        <span>${escapeHtml(user.display||user.username)}</span>
        <a class="btn ghost" href="profile.html?user=${encodeURIComponent(user.username)}">View</a>`;
      sidebarEl.appendChild(node);
    });
  }

  function wireNav(){
    const cur = currentUser();
    const side = el('#sidebarUser'); if(side) side.textContent=cur||'Not signed in';
    els('#logoutBtn, #logoutBtn2').forEach(b=>{
      if(!b) return; b.addEventListener('click',()=>{ localStorage.removeItem(STORE.currentKey); go('login.html'); });
    });
    renderSidebar();
  }

  // ---------------- Initialize ----------------
  ensureSeed();
  requireAuth();
  handleLogin();
  handleSignup();
  handleComposer();

  document.addEventListener('DOMContentLoaded', ()=>{
    wireNav();
    renderFeed();
    renderProfile();
    document.addEventListener('followChanged', renderSidebar);
  });

})();