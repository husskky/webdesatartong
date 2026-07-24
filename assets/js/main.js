/* ============================================
   Desa Taringgul Tonggoh — main.js
   Render UMKM & Wisata dari JSON + Overlay detail
   ============================================ */

(function () {
  "use strict";

  let umkmData = [];
  let wisataData = [];
  let activeFilter = "Semua";

  // ---------- Utilitas ----------
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

  // Terima foto sebagai string tunggal ATAU array, selalu kembalikan array bersih
  function normalizeFotos(foto) {
    if (!foto) return [];
    if (Array.isArray(foto)) return foto.filter(Boolean);
    return [foto];
  }

  // ---------- Fetch data ----------
  async function loadData() {
    try {
      const [umkmRes, wisataRes, desaRes] = await Promise.all([
        fetch("data/umkm.json"),
        fetch("data/wisata.json"),
        fetch("data/desa.json")
      ]);

      checkResponse(umkmRes, "data/umkm.json");
      checkResponse(wisataRes, "data/wisata.json");
      checkResponse(desaRes, "data/desa.json");

      const umkmJson = await safeJson(umkmRes, "data/umkm.json");
      const wisataJson = await safeJson(wisataRes, "data/wisata.json");
      const desaJson = await safeJson(desaRes, "data/desa.json");
      umkmData = umkmJson.umkm || [];
      wisataData = wisataJson.wisata || [];

      renderStats(desaJson);
      renderFilterChips(computeKategoriSummary(umkmData));
      renderUmkmGrid();
      renderWisataGrid();
    } catch (err) {
      console.error("Gagal memuat data:", err);
      showLoadError("umkmGrid", err.message);
      showLoadError("wisataGrid", err.message);
    }
  }

  function checkResponse(res, label) {
    if (!res.ok) {
      throw new Error(`Gagal memuat ${label} (HTTP ${res.status}). Pastikan file ini ada di folder yang benar.`);
    }
  }

  async function safeJson(res, label) {
    const text = await res.text();
    if (!text || !text.trim()) {
      throw new Error(`File ${label} kosong. Pastikan file ini benar-benar berisi data JSON, bukan file kosong.`);
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`File ${label} berisi JSON yang tidak valid. Periksa kembali format isinya.`);
    }
  }

  function showLoadError(gridId, detail) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.innerHTML = "";
    const msg = detail
      ? `Data belum bisa dimuat: <strong>${escapeHtml(detail)}</strong>`
      : "Data belum bisa dimuat. Jika Anda membuka file ini secara lokal, jalankan lewat server (misalnya <code>python -m http.server</code>) agar data dapat terbaca.";
    grid.appendChild(el("div", "empty-state", msg));
  }

  // ---------- Stats strip ----------
  function renderStats(desaJson) {
    const statUmkm = document.querySelector('[data-stat="umkm"]');
    const statWisata = document.querySelector('[data-stat="wisata"]');
    const statDusun = document.querySelector('[data-stat="dusun"]');
    // total dihitung dari jumlah entri array, bukan field "total" manual di JSON
    if (statUmkm) statUmkm.textContent = umkmData.length;
    if (statWisata) statWisata.textContent = wisataData.length;
    if (statDusun) statDusun.textContent = desaJson.jumlah_dusun ?? "–";
  }

  // ---------- Hitung ringkasan kategori otomatis dari data ----------
  function computeKategoriSummary(items) {
    const summary = {};
    items.forEach((item) => {
      const cat = item.kategori || "Lainnya";
      summary[cat] = (summary[cat] || 0) + 1;
    });
    return summary;
  }

  // ---------- Filter chips ----------
  function renderFilterChips(summary) {
    const row = document.getElementById("filterRow");
    if (!row) return;

    const categories = ["Semua", ...Object.keys(summary || {})];
    row.innerHTML = "";

    categories.forEach((cat) => {
      const chip = el("button", "chip" + (cat === activeFilter ? " active" : ""), escapeHtml(cat));
      chip.type = "button";
      chip.dataset.cat = cat;
      chip.addEventListener("click", () => {
        activeFilter = cat;
        document.querySelectorAll("#filterRow .chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        renderUmkmGrid();
      });
      row.appendChild(chip);
    });
  }

  // ---------- Render kartu UMKM ----------
  function renderUmkmGrid() {
    const grid = document.getElementById("umkmGrid");
    if (!grid) return;

    const filtered =
      activeFilter === "Semua"
        ? umkmData
        : umkmData.filter((u) => u.kategori === activeFilter);

    grid.innerHTML = "";

    if (filtered.length === 0) {
      grid.appendChild(el("div", "empty-state", "Belum ada UMKM pada kategori ini."));
      return;
    }

    filtered.forEach((item, idx) => {
      const card = buildItemCard(item, "umkm", idx);
      grid.appendChild(card);
    });
  }

  // ---------- Render kartu Wisata ----------
  function renderWisataGrid() {
    const grid = document.getElementById("wisataGrid");
    if (!grid) return;

    grid.innerHTML = "";

    if (wisataData.length === 0) {
      grid.appendChild(el("div", "empty-state", "Data wisata belum tersedia."));
      return;
    }

    wisataData.forEach((item, idx) => {
      const card = buildItemCard(item, "wisata", idx);
      grid.appendChild(card);
    });
  }

  // ---------- Builder kartu (dipakai UMKM & Wisata) ----------
  function buildItemCard(item, type, idx) {
    const card = el("button", "item-card reveal" + (idx % 3 === 1 ? " reveal-delay1" : idx % 3 === 2 ? " reveal-delay2" : ""));
    card.type = "button";
    card.setAttribute("aria-haspopup", "dialog");

    const photoWrap = el("div", "item-photo");
    const fotos = normalizeFotos(item.foto);
    if (fotos.length > 0) {
      const img = document.createElement("img");
      img.src = fotos[0];
      img.alt = item.nama;
      img.loading = "lazy";
      img.onerror = function () {
        photoWrap.innerHTML = "Foto belum tersedia";
      };
      photoWrap.appendChild(img);
      if (fotos.length > 1) {
        photoWrap.appendChild(el("div", "item-photo-count", `📷 ${fotos.length}`));
      }
    } else {
      photoWrap.textContent = "Foto belum tersedia";
    }
    card.appendChild(photoWrap);

    const body = el("div", "item-body");
    const cat = type === "umkm" ? item.kategori : item.kategori;
    body.appendChild(el("div", "item-cat", escapeHtml(cat || "Lainnya")));
    body.appendChild(el("div", "item-name", escapeHtml(item.nama)));

    const shortDesc = type === "umkm" ? item.produk : item.deskripsi;
    body.appendChild(el("div", "item-desc", escapeHtml(shortDesc || "Info produk belum tersedia.")));
    body.appendChild(el("div", "item-hint", "Lihat detail →"));

    card.appendChild(body);

    card.addEventListener("click", () => openOverlay(item, type));

    return card;
  }

  // ---------- Overlay ----------
  let lastFocusedEl = null;
  let currentFotos = [];
  let currentFotoIndex = 0;
  let carouselGoTo = null;

  function openOverlay(item, type) {
    const backdrop = document.getElementById("overlayBackdrop");
    const content = document.getElementById("overlayContent");
    if (!backdrop || !content) return;

    currentFotos = normalizeFotos(item.foto);
    currentFotoIndex = 0;

    lastFocusedEl = document.activeElement;
    content.innerHTML = buildOverlayHtml(item, type);
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";

    initCarousel(content);

    const closeBtn = content.querySelector(".overlay-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeOverlay() {
    const backdrop = document.getElementById("overlayBackdrop");
    if (!backdrop) return;
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  function buildOverlayHtml(item, type) {
    const nama = escapeHtml(item.nama);
    const kategori = escapeHtml(item.kategori || "Lainnya");
    const desc = type === "umkm" ? item.produk : item.deskripsi;
    const descHtml = desc ? escapeHtml(desc) : "Informasi produk/layanan belum tersedia.";

    const photoHtml = buildCarouselHtml(nama);

    let metaRows = "";

    if (item.jam_buka) {
      metaRows += metaRow("🕒", escapeHtml(item.jam_buka));
    } else {
      metaRows += metaRow("🕒", "Jam buka belum tersedia", true);
    }

    if (item.alamat) {
      metaRows += metaRow("📍", escapeHtml(item.alamat));
    } else {
      metaRows += metaRow("📍", "Alamat belum tersedia, lihat titik lokasi di peta", true);
    }

    let actions = "";
    if (item.link_wa) {
      actions += `<a class="btn btn-primary" href="${escapeHtml(item.link_wa)}" target="_blank" rel="noopener">Hubungi via WA</a>`;
    }
    if (item.link_gmaps) {
      actions += `<a class="btn btn-ghost" href="${escapeHtml(item.link_gmaps)}" target="_blank" rel="noopener" style="border-color:var(--ink);">Lihat di Peta</a>`;
    }
    if (!actions) {
      actions = `<div class="overlay-meta-row muted" style="margin-top:4px;">Kontak &amp; lokasi belum tersedia</div>`;
    }

    return `
      <button type="button" class="overlay-close" aria-label="Tutup" data-close>&times;</button>
      ${photoHtml}
      <div class="overlay-body">
        <div class="overlay-cat">${kategori}</div>
        <h3 class="overlay-name">${nama}</h3>
        <p class="overlay-desc">${descHtml}</p>
        <div class="overlay-meta">${metaRows}</div>
        <div class="overlay-actions">${actions}</div>
      </div>
    `;
  }

  function buildCarouselHtml(altText) {
    if (currentFotos.length === 0) {
      return `<div class="overlay-photo"><div class="overlay-photo-empty">Foto belum tersedia</div></div>`;
    }

    const slides = currentFotos
      .map(
        (src, i) =>
          `<div class="carousel-slide${i === 0 ? " active" : ""}" data-slide="${i}">
             <img src="${escapeHtml(src)}" alt="${altText}" onerror="this.parentElement.innerHTML='<div class=&quot;overlay-photo-empty&quot;>Foto belum tersedia</div>'">
           </div>`
      )
      .join("");

    const navArrows =
      currentFotos.length > 1
        ? `
      <button type="button" class="carousel-arrow carousel-prev" aria-label="Foto sebelumnya" data-carousel-prev>&#8249;</button>
      <button type="button" class="carousel-arrow carousel-next" aria-label="Foto berikutnya" data-carousel-next>&#8250;</button>
      <div class="carousel-counter"><span data-carousel-current>1</span> / ${currentFotos.length}</div>
    `
        : "";

    const dots =
      currentFotos.length > 1
        ? `<div class="carousel-dots">${currentFotos
            .map((_, i) => `<button type="button" class="carousel-dot${i === 0 ? " active" : ""}" aria-label="Lihat foto ${i + 1}" data-carousel-dot="${i}"></button>`)
            .join("")}</div>`
        : "";

    return `
      <div class="overlay-photo" data-carousel>
        <div class="carousel-track">${slides}</div>
        ${navArrows}
      </div>
      ${dots}
    `;
  }

  function initCarousel(content) {
    carouselGoTo = null;
    if (currentFotos.length <= 1) return;

    const track = content.querySelector(".carousel-track");
    const prevBtn = content.querySelector("[data-carousel-prev]");
    const nextBtn = content.querySelector("[data-carousel-next]");
    const counter = content.querySelector("[data-carousel-current]");
    const dots = content.querySelectorAll("[data-carousel-dot]");

    function goTo(index) {
      currentFotoIndex = (index + currentFotos.length) % currentFotos.length;
      if (track) track.style.transform = `translateX(-${currentFotoIndex * 100}%)`;
      if (counter) counter.textContent = currentFotoIndex + 1;
      dots.forEach((d, i) => d.classList.toggle("active", i === currentFotoIndex));
    }

    carouselGoTo = goTo;

    if (prevBtn) prevBtn.addEventListener("click", (e) => { e.stopPropagation(); goTo(currentFotoIndex - 1); });
    if (nextBtn) nextBtn.addEventListener("click", (e) => { e.stopPropagation(); goTo(currentFotoIndex + 1); });
    dots.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        goTo(parseInt(dot.dataset.carouselDot, 10));
      });
    });

    // Swipe gesture untuk mobile
    const photoEl = content.querySelector("[data-carousel]");
    let touchStartX = 0;
    let touchEndX = 0;

    if (photoEl) {
      photoEl.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      photoEl.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 40) {
          if (diff > 0) goTo(currentFotoIndex + 1);
          else goTo(currentFotoIndex - 1);
        }
      }, { passive: true });
    }
  }

  function metaRow(icon, text, muted) {
    return `<div class="overlay-meta-row${muted ? " muted" : ""}"><span class="overlay-meta-icon">${icon}</span><span>${text}</span></div>`;
  }

  // ---------- Overlay event bindings ----------
  function initOverlayEvents() {
    const backdrop = document.getElementById("overlayBackdrop");
    if (!backdrop) return;

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop || e.target.hasAttribute("data-close")) {
        closeOverlay();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (!backdrop.classList.contains("open")) return;
      if (e.key === "Escape") {
        closeOverlay();
      } else if (e.key === "ArrowLeft" && carouselGoTo) {
        carouselGoTo(currentFotoIndex - 1);
      } else if (e.key === "ArrowRight" && carouselGoTo) {
        carouselGoTo(currentFotoIndex + 1);
      }
    });
  }

  // ---------- Sticky nav + mobile hamburger ----------
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

  // ---------- Scroll reveal (observer global, jalan ulang tiap render) ----------
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

    // Observasi awal untuk elemen statis
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    // MutationObserver supaya kartu yang di-render belakangan (dari JSON) tetap kena reveal
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

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initOverlayEvents();
    initRevealObserver();
    loadData();
  });
})();