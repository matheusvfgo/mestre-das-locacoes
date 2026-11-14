(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 760px)").matches;


  /* ── Rolagem que toca o vídeo ─────────────────────────────────────────── */
  const cine = document.querySelector(".cine");
  const canvas = cine && cine.querySelector(".cine-canvas");
  if (cine && canvas && S.frames && S.frames.total) {
    const ctx = canvas.getContext("2d");
    const total = S.frames.total;
    const padrao = celular ? S.frames.mobile : S.frames.desktop;
    const src = (i) => padrao.replace("{n}", String(i + 1).padStart(4, "0"));
    const quadros = new Array(total);
    const momentos = [...cine.querySelectorAll(".momento")];
    let alvo = 0, atual = 0, desenhado = -1;

    const carregar = (i) => {
      if (quadros[i]) return quadros[i];
      const img = new Image();
      img.decoding = "async";
      img.src = src(i);
      img.onload = () => { if (Math.round(atual) === i || desenhado === -1) desenhar(i, true); };
      return (quadros[i] = img);
    };

    // Carrega em passadas (1 a cada 8, depois 1 a cada 4…) para cobrir o filme inteiro cedo
    carregar(0);
    if (!reduzir) {
      const fila = [];
      for (const passo of [8, 4, 2, 1]) for (let i = 0; i < total; i += passo) if (!fila.includes(i)) fila.push(i);
      let k = 0;
      const lote = () => { for (let n = 0; n < 6 && k < fila.length; n++) carregar(fila[k++]); if (k < fila.length) setTimeout(lote, 40); };
      lote();
    }

    const pronto = (i) => quadros[i] && quadros[i].complete && quadros[i].naturalWidth;
    const maisProximo = (i) => {
      for (let d = 0; d < total; d++) {
        if (pronto(i - d)) return i - d;
        if (pronto(i + d)) return i + d;
      }
      return -1;
    };

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      desenhado = -1;
      desenhar(Math.round(atual), true);
    };

    function desenhar(i, forcar) {
      const j = maisProximo(i);
      if (j < 0 || (j === desenhado && !forcar)) return;
      const img = quadros[j];
      const cw = canvas.width, ch = canvas.height;
      const escala = (cw / ch < 1.3 ? Math.min : Math.max)(cw / img.naturalWidth, ch / img.naturalHeight); // desktop: cover; celular/vertical: contain
      const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      desenhado = j;
    }

    const progresso = () => {
      const r = cine.getBoundingClientRect();
      const curso = cine.offsetHeight - innerHeight;
      return Math.min(1, Math.max(0, -r.top / (curso || 1)));
    };

    const atualizarMomentos = (p) => {
      for (const m of momentos) {
        const de = parseFloat(m.dataset.de || 0), ate = parseFloat(m.dataset.ate || 1);
        m.classList.toggle("ativo", p >= de && (p < ate || (ate >= 1 && p >= 1)));
      }
      cine.classList.toggle("andou", p > 0.02);
    };

    const quadro = () => {
      alvo = progresso() * (total - 1);
      atual += (alvo - atual) * 0.18; // suaviza: sensação de filme, não de slide
      if (Math.abs(alvo - atual) < 0.05) atual = alvo;
      desenhar(Math.round(atual));
      atualizarMomentos(atual / (total - 1));
      requestAnimationFrame(quadro);
    };

    addEventListener("resize", ajustar);
    ajustar();
    if (reduzir) atualizarMomentos(0);
    else requestAnimationFrame(quadro);
  }

  /* ── Parallax leve nas artes ──────────────────────────────────────────── */
  const artes = reduzir ? [] : [...document.querySelectorAll(".arte")];
  if (artes.length) {
    const mover = () => {
      for (const a of artes) {
        const r = a.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        a.style.transform = `translate3d(0, ${(c * -60).toFixed(1)}px, 0) scale(1.08)`;
      }
    };
    addEventListener("scroll", () => requestAnimationFrame(mover), { passive: true });
    mover();
  }

  /* ── Efeito de obra: divide os títulos h2 em letras (animação por CSS) ─── */
  document.querySelectorAll(".painel h2").forEach((h) => {
    const txt = h.textContent.trim();
    h.setAttribute("aria-label", txt);
    h.classList.add("obra");
    h.textContent = "";
    let i = 0;
    txt.split(" ").forEach((p, k, arr) => {
      const w = document.createElement("span");
      w.className = "palavra"; w.setAttribute("aria-hidden", "true");
      for (const ch of p) { const l = document.createElement("span"); l.className = "letra"; l.style.setProperty("--i", i++); l.textContent = ch; w.appendChild(l); }
      h.appendChild(w);
      if (k < arr.length - 1) { h.appendChild(document.createTextNode(" ")); i++; }
    });
  });

  /* ── Títulos: o efeito toca de novo toda vez que o título entra na tela (descendo ou subindo) ── */
  const ioTitulos = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("on", e.isIntersecting)), { threshold: 0.4 });
  document.querySelectorAll("h2.obra").forEach((h) => ioTitulos.observe(h));

  /* ── Barra de progresso de obra ── */
  const barra = document.createElement("div");
  barra.className = "obra-progresso";
  document.body.appendChild(barra);
  let pend = false;
  const prog = () => { pend = false; const m = document.documentElement.scrollHeight - innerHeight; barra.style.transform = `scaleX(${m > 0 ? Math.min(1, scrollY / m) : 0})`; };
  addEventListener("scroll", () => { if (!pend) { pend = true; requestAnimationFrame(prog); } }, { passive: true });
  prog();

  /* ── Rolagem suave com o mouse (desktop): inércia leve, sem biblioteca ── */
  if (!reduzir && matchMedia("(pointer: fine)").matches) {
    document.documentElement.style.scrollBehavior = "auto";
    let alvoY = scrollY, rodando = false;
    const max = () => document.documentElement.scrollHeight - innerHeight;
    const passo = () => {
      if (!rodando) return;
      const d = alvoY - scrollY;
      if (Math.abs(d) < 1) { scrollTo(0, alvoY); rodando = false; return; }
      const s = d * 0.085;
      scrollTo(0, scrollY + (Math.abs(s) < 1 ? Math.sign(d) : s));
      requestAnimationFrame(passo);
    };
    addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.defaultPrevented) return;
      e.preventDefault();
      const k = e.deltaMode === 1 ? 32 : 1;
      alvoY = Math.max(0, Math.min(max(), (rodando ? alvoY : scrollY) + e.deltaY * k * 0.9));
      if (!rodando) { rodando = true; requestAnimationFrame(passo); }
    }, { passive: false });
    const parar = () => { rodando = false; alvoY = scrollY; };
    addEventListener("keydown", parar);
    addEventListener("mousedown", parar);
    addEventListener("touchstart", parar, { passive: true });
  }

  /* ── Topo, revelar e ano ──────────────────────────────────────────────── */
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  let formNaTela = false; // o botão flutuante se recolhe para não cobrir o "Enviar"
  const aoRolar = () => {
    topo && topo.classList.toggle("rolou", scrollY > 40);
    whats && whats.classList.toggle("visivel", scrollY > innerHeight * 0.6 && !formNaTela);
  };
  const formEl = document.querySelector(".form");
  if (formEl) new IntersectionObserver(([e]) => { formNaTela = e.isIntersecting; aoRolar(); }).observe(formEl);
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
  }), { threshold: 0.18 });
  document.querySelectorAll(".revelar").forEach((el) => io.observe(el));
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ── WhatsApp ─────────────────────────────────────────────────────────── */
  if (whats && S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    whats.href = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
  }

  /* ── Formulário → e-mail ──────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return; // robô
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        c.closest(".campo").classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar("Confira os campos destacados.", "falha");

      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      const assunto = S.contato.assunto || `Novo contato pelo site ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }

      botao.disabled = true;
      avisar("Enviando…");
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(corpo),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset();
        avisar("Recebemos seu contato. Em breve falamos com você.", "ok");
      } catch (e) {
        console.warn("Falha no envio do formulário:", e);
        avisar("Não foi possível enviar agora. Chame a gente no WhatsApp.", "falha");
      } finally {
        botao.disabled = false;
      }
    });
  }
})();
