/* ============================================
   Desa Taringgul Tonggoh — kkn.js
   Render struktur organisasi, proker, galeri KKN
   ============================================ */

(function () {
  "use strict";

  let kknData = null;

  function el(tag, className, html) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function loadData() {
    try {
      const res = await fetch("data/kkn.json");
      if (!res.ok) throw new Error("Response tidak ok");
      kknData = await res.json();

      renderInfo();
      renderStruktur();
      renderProker();
      renderGaleri();
    } catch (err) {
      console.error("Gagal memuat data KKN:", err);
      const struktur = document.getElementById("strukturContainer");
      if (struktur) {
        struktur.innerHTML =
          '<div class="empty-state">Data belum bisa dimuat. Jika Anda membuka file ini secara lokal, jalankan lewat server (misalnya <code>python -m http.server</code>) agar data dapat terbaca.</div>';
      }
    }
  }

  function renderInfo() {
    if (!kknData.info) return;
    const periodeEl = document.getElementById("kknPeriode");
    const descEl = document.getElementById("kknDesc");
    if (periodeEl) periodeEl.textContent = kknData.info.periode || "";
    if (descEl) descEl.textContent = kknData.info.deskripsi || "";
  }

  function renderStruktur() {
    const container = document.getElementById("strukturContainer");
    if (!container || !kknData.divisi) return;

    container.innerHTML = "";

    kknData.divisi.forEach((div, i) => {
      const block = el("div", "divisi-block reveal" + (i % 2 === 1 ? " reveal-delay1" : ""));
      const title = el("div", "divisi-title");
      title.appendChild(el("h3", null, escapeHtml(div.nama)));
      title.appendChild(el("div", "line"));
      block.appendChild(title);

      if (!div.anggota || div.anggota.length === 0) {
        block.appendChild(el("div", "empty-divisi", "Anggota divisi ini belum ditambahkan."));
      } else {
        const grid = el("div", "anggota-grid");
        div.anggota.forEach((anggota) => {
          grid.appendChild(buildAnggotaCard(anggota, div.nama));
        });
        block.appendChild(grid);
      }

      container.appendChild(block);
    });
  }

  function buildAnggotaCard(anggota, namaDivisi) {
    const card = el("button", "anggota-card");
    card.type = "button";
    card.setAttribute("aria-haspopup", "dialog");

    const photoWrap = el("div", "anggota-photo");
    if (anggota.foto) {
      const img = document.createElement("img");
      img.src = anggota.foto;
      img.alt = anggota.nama;
      img.loading = "lazy";
      img.onerror = function () {
        photoWrap.innerHTML = "Foto belum ada";
      };
      photoWrap.appendChild(img);
    } else {
      photoWrap.textContent = "Foto belum ada";
    }
    card.appendChild(photoWrap);

    const body = el("div", "anggota-body");
    body.appendChild(el("div", "anggota-nama", escapeHtml(anggota.nama)));
    body.appendChild(el("div", "anggota-jabatan", escapeHtml(anggota.jabatan || namaDivisi)));
    card.appendChild(body);

    card.addEventListener("click", () => openAnggotaOverlay(anggota, namaDivisi));

    return card;
  }

  function renderProker() {
    const grid = document.getElementById("prokerGrid");
    if (!grid || !kknData.proker) return;

    grid.innerHTML = "";

    if (kknData.proker.length === 0) {
      grid.appendChild(el("div", "empty-state", "Program kerja belum ditambahkan."));
      return;
    }

    kknData.proker.forEach((p, idx) => {
      const card = el("button", "proker-card reveal" + (idx % 2 === 1 ? " reveal-delay1" : ""));
      card.type = "button";
      card.setAttribute("aria-haspopup", "dialog");

      const photoWrap = el("div", "proker-photo");
      if (p.foto) {
        const img = document.createElement("img");
        img.src = p.foto;
        img.alt = p.nama;
        img.loading = "lazy";
        img.onerror = function () {
          photoWrap.innerHTML = "Foto belum ada";
        };
        photoWrap.appendChild(img);
      } else {
        photoWrap.textContent = "Foto belum ada";
      }
      card.appendChild(photoWrap);

      const body = el("div", "proker-body");
      body.appendChild(el("div", "proker-divisi", escapeHtml(p.divisi || "Program Kerja")));
      body.appendChild(el("div", "proker-nama", escapeHtml(p.nama)));
      body.appendChild(el("div", "proker-desc", escapeHtml(p.deskripsi || "Deskripsi belum tersedia.")));
      card.appendChild(body);

      card.addEventListener("click", () => openProkerOverlay(p));

      grid.appendChild(card);
    });
  }

  function renderGaleri() {
    const grid = document.getElementById("galeriGrid");
    if (!grid || !kknData.galeri) return;

    grid.innerHTML = "";

    if (kknData.galeri.length === 0) {
      grid.appendChild(el("div", "empty-state", "Galeri belum ditambahkan."));
      return;
    }

    kknData.galeri.forEach((g, idx) => {
      const item = el("div", "galeri-item reveal" + (idx % 4 === 1 ? " reveal-delay1" : idx % 4 === 2 ? " reveal-delay2" : ""));
      if (g.foto) {
        const img = document.createElement("img");
        img.src = g.foto;
        img.alt = g.caption || "Dokumentasi kegiatan KKN";
        img.loading = "lazy";
        img.onerror = function () {
          item.innerHTML = '<div class="galeri-photo-fallback">Foto belum ada</div>';
        };
        item.appendChild(img);
      } else {
        item.appendChild(el("div", "galeri-photo-fallback", "Foto belum ada"));
      }
      grid.appendChild(item);
    });
  }

  // ---------- Overlay: Anggota ----------
  function openAnggotaOverlay(anggota, namaDivisi) {
    const backdrop = document.getElementById("overlayBackdrop");
    const content = document.getElementById("overlayContent");
    const modal = backdrop ? backdrop.querySelector(".overlay-modal") : null;
    if (!backdrop || !content) return;

    const photoHtml = anggota.foto
      ? `<img src="${escapeHtml(anggota.foto)}" alt="${escapeHtml(anggota.nama)}" onerror="this.parentElement.innerHTML='<div class=&quot;overlay-photo-empty theme-anggota&quot;>Foto belum ada</div>'">`
      : `<div class="overlay-photo-empty theme-anggota">Foto belum ada</div>`;

    content.innerHTML = `
      <button type="button" class="overlay-close" aria-label="Tutup" data-close>&times;</button>
      <div class="overlay-photo theme-anggota">${photoHtml}</div>
      <div class="overlay-body">
        <div class="overlay-cat blue">${escapeHtml(namaDivisi)}</div>
        <h3 class="overlay-name">${escapeHtml(anggota.nama)}</h3>
        <p class="overlay-desc">${escapeHtml(anggota.jabatan || namaDivisi)}</p>
      </div>
    `;

    if (modal) modal.className = "overlay-modal theme-anggota";
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    const closeBtn = content.querySelector(".overlay-close");
    if (closeBtn) closeBtn.focus();
  }

  // ---------- Overlay: Proker ----------
  function openProkerOverlay(p) {
    const backdrop = document.getElementById("overlayBackdrop");
    const content = document.getElementById("overlayContent");
    const modal = backdrop ? backdrop.querySelector(".overlay-modal") : null;
    if (!backdrop || !content) return;

    const photoHtml = p.foto
      ? `<img src="${escapeHtml(p.foto)}" alt="${escapeHtml(p.nama)}" onerror="this.parentElement.innerHTML='<div class=&quot;overlay-photo-empty theme-proker&quot;>Foto belum ada</div>'">`
      : `<div class="overlay-photo-empty theme-proker">Foto belum ada</div>`;

    const tanggalRow = p.tanggal
      ? `<div class="overlay-meta-row"><span class="overlay-meta-icon">🗓️</span><span>${escapeHtml(p.tanggal)}</span></div>`
      : `<div class="overlay-meta-row muted"><span class="overlay-meta-icon">🗓️</span><span>Tanggal belum ditentukan</span></div>`;

    content.innerHTML = `
      <button type="button" class="overlay-close" aria-label="Tutup" data-close>&times;</button>
      <div class="overlay-photo theme-proker">${photoHtml}</div>
      <div class="overlay-body">
        <div class="overlay-cat red">${escapeHtml(p.divisi || "Program Kerja")}</div>
        <h3 class="overlay-name">${escapeHtml(p.nama)}</h3>
        <p class="overlay-desc">${escapeHtml(p.deskripsi || "Deskripsi belum tersedia.")}</p>
        <div class="overlay-meta">${tanggalRow}</div>
      </div>
    `;

    if (modal) modal.className = "overlay-modal theme-proker";
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
    const closeBtn = content.querySelector(".overlay-close");
    if (closeBtn) closeBtn.focus();
  }

  // ---------- Overlay close events (sama pola dengan main.js) ----------
  function initOverlayEvents() {
    const backdrop = document.getElementById("overlayBackdrop");
    if (!backdrop) return;

    function closeOverlay() {
      backdrop.classList.remove("open");
      document.body.style.overflow = "";
    }

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.hasAttribute("data-close")) {
        closeOverlay();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && backdrop.classList.contains("open")) {
        closeOverlay();
      }
    });
  }

  function initNav() {
    const nav = document.getElementById("nav");
    if (!nav) return;
    window.addEventListener("scroll", () => {
      nav.classList.toggle("scrolled", window.scrollY > 20);
    });

    const toggle = document.getElementById("navToggle");
    const links = document.getElementById("navLinks");
    if (!toggle || !links) return;

    function closeMenu() {
      links.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("open");
      toggle.classList.toggle("open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    links.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  function initRevealObserver() {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".reveal").forEach((elx) => io.observe(elx));

    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList && node.classList.contains("reveal")) {
            io.observe(node);
          }
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initOverlayEvents();
    initRevealObserver();
    loadData();
  });
})();