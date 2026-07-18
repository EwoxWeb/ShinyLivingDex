(function () {
  const STORAGE_KEY = "shiny-living-dex-v1";

  const games = [
    "Pokemon Legend Z-A", "Pokemon Ecarlate", "Pokemon Violet", "Legendes Pokemon Arceus", "Pokemon Epee",
    "Pokemon Bouclier", "Pokemon Diamant Etincelant", "Pokemon Perle Scintillante",
    "Pokemon Let's Go Pikachu", "Pokemon Let's Go Evoli", "Pokemon Ultra-Soleil", "Pokemon Ultra-Lune", "Pokemon Soleil", "Pokemon Lune",
    "Pokemon X", "Pokemon Y", "Pokemon Rubis Omega", "Pokemon Saphir Alpha", "Pokemon Noir 2", "Pokemon Blanc 2", "Pokemon Noir", "Pokemon Blanc",
    "Pokemon Platine", "Pokemon Diamant", "Pokemon Perle", "Pokemon HeartGold", "Pokemon SoulSilver", "Pokemon Or", "Pokemon Argent",
    "Pokemon Cristal", "Pokemon Jaune", "Pokemon Rouge Feu", "Pokemon Vert Feuille", "Pokemon Rouge", "Pokemon Bleu"
  ];
  const methods = [
    "Rencontre", "Masuda", "Reset", "Raid", "Expedition Dynamax", "Apparition massive",
    "SOS", "Safari des Amis", "Peche a la chaine", "Horde", "Navi-Dex", "Poke-Radar"
  ];
  const balls = [
    "", "Poke Ball", "Super Ball", "Hyper Ball", "Master Ball", "Premier Ball",
    "Honor Ball", "Luxe Ball", "Soin Ball", "Filet Ball", "Scuba Ball", "Faiblo Ball",
    "Chrono Ball", "Bis Ball", "Rapide Ball", "Sombre Ball", "Memoire Ball",
    "Safari Ball", "Parc Ball", "Speed Ball", "Niveau Ball", "Appat Ball",
    "Masse Ball", "Love Ball", "Copain Ball", "Lune Ball", "Reve Ball", "Ultra Ball"
  ];

  const state = {
    pokemon: [],
    entries: loadEntries(),
    activePage: location.hash.replace("#", "") || "all",
    activeFormCategory: "alola",
    huntPickId: null,
    search: "",
    status: "all",
    current: null
  };

  const el = {
    tabs: document.querySelector("#generation-tabs"),
    formTabs: document.querySelector("#form-tabs"),
    grid: document.querySelector("#dex-grid"),
    pageTitle: document.querySelector("#page-title"),
    pageSubtitle: document.querySelector("#page-subtitle"),
    progressBar: document.querySelector("#progress-bar"),
    ownedCount: document.querySelector("#owned-count"),
    totalCount: document.querySelector("#total-count"),
    search: document.querySelector("#search-input"),
    status: document.querySelector("#status-filter"),
    exportButton: document.querySelector("#export-button"),
    importInput: document.querySelector("#import-input"),
    huntButton: document.querySelector("#hunt-button"),
    dialog: document.querySelector("#entry-dialog"),
    form: document.querySelector("#entry-form"),
    dialogNumber: document.querySelector("#dialog-number"),
    dialogName: document.querySelector("#dialog-name"),
    dialogImage: document.querySelector("#dialog-image"),
    caught: document.querySelector("#caught-input"),
    game: document.querySelector("#game-input"),
    method: document.querySelector("#method-input"),
    encounters: document.querySelector("#encounters-input"),
    ball: document.querySelector("#ball-input"),
    gender: document.querySelector("#gender-input"),
    date: document.querySelector("#date-input"),
    origin: document.querySelector("#origin-input"),
    deleteEntry: document.querySelector("#delete-entry")
  };

  const pages = [
    { id: "all", label: "Tous", title: "Tous les Pokemon", all: true },
    { id: "hunt", label: "Hunt", title: "Hunt aleatoire", hunt: true },
    { id: "gen-1", label: "Gen 1", title: "Generation 1", range: [1, 151] },
    { id: "gen-2", label: "Gen 2", title: "Generation 2", range: [152, 251] },
    { id: "gen-3", label: "Gen 3", title: "Generation 3", range: [252, 386] },
    { id: "gen-4", label: "Gen 4", title: "Generation 4", range: [387, 493] },
    { id: "gen-5", label: "Gen 5", title: "Generation 5", range: [494, 649] },
    { id: "gen-6", label: "Gen 6", title: "Generation 6", range: [650, 721] },
    { id: "gen-7", label: "Gen 7", title: "Generation 7", range: [722, 809] },
    { id: "gen-8", label: "Gen 8", title: "Generation 8", range: [810, 905] },
    { id: "gen-9", label: "Gen 9", title: "Generation 9", range: [906, 1025] },
    { id: "forms", label: "Formes", title: "Formes regionales et variantes", forms: true }
  ];

  const formCategories = [
    { id: "alola", label: "Alola", suffix: "-a" },
    { id: "galar", label: "Galar", suffix: "-g" },
    { id: "hisui", label: "Hisui", suffix: "-hisui" },
    { id: "paldea", label: "Paldea", suffix: "-p" }
  ];

  init();

  async function init() {
    fillSelect(el.game, games, "Jeu non renseigné");
    fillSelect(el.method, methods, "Méthode non renseignée");
    el.ball.innerHTML = balls.map((ball) => `<option value="${escapeHtml(ball)}">${escapeHtml(ball || "Non renseignee")}</option>`).join("");
    bindEvents();
    renderTabs();
    renderFormTabs();
    state.pokemon = await loadPokemon();
    render();
  }

  function bindEvents() {
    el.search.addEventListener("input", () => {
      state.search = el.search.value.trim().toLowerCase();
      render();
    });
    el.status.addEventListener("change", () => {
      state.status = el.status.value;
      render();
    });
    el.form.addEventListener("submit", saveCurrentEntry);
    el.deleteEntry.addEventListener("click", deleteCurrentEntry);
    el.exportButton.addEventListener("click", exportData);
    el.huntButton.addEventListener("click", () => {
      location.hash = "hunt";
    });
    el.importInput.addEventListener("change", importData);
    window.addEventListener("hashchange", () => {
      state.activePage = location.hash.replace("#", "") || "all";
      render();
    });
  }

  async function loadPokemon() {
    const localSprites = Array.isArray(window.LOCAL_SHINY_SPRITES) ? window.LOCAL_SHINY_SPRITES : [];
    const localMap = buildLocalMap(localSprites);
    const baseData = Array.isArray(window.POKEMON_DATA) ? window.POKEMON_DATA : [];

    if (!baseData.length) {
      return localSprites.map((item, index) => ({
        id: item.slug,
        dex: index + 1,
        name: item.name,
        slug: item.slug,
        generation: guessGeneration(index + 1),
        image: item.path,
        isForm: item.slug.includes("-")
      }));
    }

    return baseData
      .map((item) => {
        const slug = normaliseSlug(item.name);
        const local = findLocalSprite(item.name, localMap);
        return {
          id: String(item.dex),
          dex: item.dex,
          name: item.name,
          slug,
          generation: item.generation,
          image: local ? local.path : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${item.dex}.png`,
          isForm: false
        };
      })
      .concat(buildLocalForms(localSprites, baseData))
      .sort((a, b) => (a.dex || 9999) - (b.dex || 9999) || a.name.localeCompare(b.name));
  }

  function buildLocalMap(localSprites) {
    const map = new Map();
    localSprites.forEach((item) => {
      const slug = normaliseSlug(item.slug);
      map.set(slug, item);
      map.set(slug.replace(/-/g, ""), item);
    });
    return map;
  }

  function findLocalSprite(name, localMap) {
    const slug = normaliseSlug(name);
    const compact = slug.replace(/-/g, "");
    const aliases = {
      "m-mime": "mmime",
      "mime-jr": "mimejr",
      "type-0": "type0",
      "ho-oh": "ho-oh",
      "porygon-z": "porygon-z",
      "flabebe": "flabebe",
      "nidoran-f": "nidoran-f",
      "nidoran-m": "nidoran-m"
    };
    return localMap.get(slug) || localMap.get(compact) || localMap.get(aliases[slug]);
  }

  function buildLocalForms(localSprites, baseData) {
    return localSprites
      .map((item) => {
        const category = getFormCategory(item.slug);
        return category ? { item, category } : null;
      })
      .filter(Boolean)
      .map((item, index) => ({
        id: `form-${item.item.slug}`,
        dex: getBaseDexNumber(item.item.name, item.category, baseData) || 10000 + index,
        name: formatRegionalFormName(item.item.name, item.category),
        slug: item.item.slug,
        generation: 0,
        image: item.item.path,
        isForm: true,
        formCategory: item.category.id
      }));
  }

  function getFormCategory(slug) {
    return formCategories.find((category) => slug.endsWith(category.suffix));
  }

  function formatRegionalFormName(name, category) {
    const suffix = category.suffix.slice(1);
    const pattern = new RegExp(`\\s+${suffix}$`, "i");
    return name.replace(pattern, "");
  }

  function getBaseDexNumber(name, category, baseData) {
    const baseName = formatRegionalFormName(name, category);
    const baseSlug = normaliseSlug(baseName);
    const basePokemon = baseData.find((pokemon) => normaliseSlug(pokemon.name) === baseSlug);
    return basePokemon ? basePokemon.dex : null;
  }

  function renderTabs() {
    el.tabs.innerHTML = pages.filter((page) => !page.hunt).map((page) => (
      `<button class="tab" type="button" data-page="${page.id}">${page.label}</button>`
    )).join("");
    el.tabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button) return;
      location.hash = button.dataset.page;
    });
  }

  function renderFormTabs() {
    el.formTabs.innerHTML = formCategories.map((category) => (
      `<button class="tab" type="button" data-form-category="${category.id}">${category.label}</button>`
    )).join("");
    el.formTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-form-category]");
      if (!button) return;
      state.activeFormCategory = button.dataset.formCategory;
      render();
    });
  }

  function render() {
    if (!pages.some((page) => page.id === state.activePage)) state.activePage = "all";
    const page = pages.find((item) => item.id === state.activePage);
    const pagePokemon = getPagePokemon(page);
    const filtered = pagePokemon.filter(matchesFilters);
    const owned = pagePokemon.filter((pokemon) => state.entries[pokemon.id]?.caught).length;
    const totalOwned = state.pokemon.filter((pokemon) => state.entries[pokemon.id]?.caught).length;

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.page === page.id);
    });
    el.huntButton.classList.toggle("active", page.hunt);
    el.formTabs.classList.toggle("visible", Boolean(page.forms));
    el.formTabs.querySelectorAll("[data-form-category]").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.formCategory === state.activeFormCategory);
    });

    if (page.hunt) {
      renderHuntPage(pagePokemon, owned);
      return;
    }

    const formCategory = formCategories.find((category) => category.id === state.activeFormCategory);
    el.pageTitle.textContent = page.forms ? `${page.title} - ${formCategory.label}` : page.title;
    el.pageSubtitle.textContent = `${owned} / ${pagePokemon.length} shiny renseignes`;
    el.progressBar.style.width = pagePokemon.length ? `${(owned / pagePokemon.length) * 100}%` : "0";
    el.ownedCount.textContent = totalOwned;
    el.totalCount.textContent = `/ ${state.pokemon.length} captures`;
    el.grid.innerHTML = filtered.length ? renderGridCards(filtered, page) : `<p class="empty-state">Aucun Pokemon pour ces filtres.</p>`;
    el.grid.querySelectorAll(".pokemon-card").forEach((button) => {
      button.addEventListener("click", () => openEntry(button.dataset.id));
    });
  }

  function getPagePokemon(page) {
    if (page.all || page.hunt) {
      return getAllPokemonOrdered();
    }
    if (page.forms) {
      return state.pokemon.filter((pokemon) => pokemon.isForm && pokemon.formCategory === state.activeFormCategory);
    }
    return state.pokemon.filter((pokemon) => pokemon.dex >= page.range[0] && pokemon.dex <= page.range[1] && !pokemon.isForm);
  }

  function getAllPokemonOrdered() {
    return state.pokemon
      .slice()
      .sort((a, b) => {
        if (a.isForm !== b.isForm) return a.isForm ? 1 : -1;
        return (a.dex || 9999) - (b.dex || 9999) || a.name.localeCompare(b.name);
      });
  }

  function matchesFilters(pokemon) {
    const entry = state.entries[pokemon.id] || {};
    if (state.status === "owned" && !entry.caught) return false;
    if (state.status === "missing" && entry.caught) return false;
    if (!state.search) return true;
    return [pokemon.name, pokemon.slug, entry.game, entry.method, entry.ball, entry.gender, formatOriginLabel(entry.origin)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(state.search));
  }

  function formatOriginLabel(origin) {
    if (!origin) return "";
    if (origin === "direct") return "Obtenu direct";
    if (origin === "trade") return "Echange / transfert";
    if (origin.startsWith("evolved:")) return `Evolue depuis ${origin.slice(8)}`;
    return origin;
  }

  function renderCard(pokemon) {
    const entry = state.entries[pokemon.id] || {};
    const originLabel = formatOriginLabel(entry.origin);
    const dateLabel = entry.date ? new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
    const meta = [entry.game, entry.method, entry.encounters ? `${entry.encounters} rencontres` : "", originLabel, dateLabel].filter(Boolean).join(" - ");
    return `
      <button class="pokemon-card ${entry.caught ? "owned" : ""}" type="button" data-id="${escapeHtml(pokemon.id)}">
        <span class="dex-number">#${String(pokemon.dex).padStart(3, "0")}</span>
        ${entry.caught ? `<span class="owned-mark">*</span>` : ""}
        <img src="${escapeHtml(pokemon.image)}" alt="${escapeHtml(pokemon.name)}" loading="lazy">
        <span class="pokemon-name">${escapeHtml(pokemon.name)}</span>
        ${meta ? `<span class="meta-line">${escapeHtml(meta)}</span>` : ""}
      </button>
    `;
  }

  function renderGridCards(pokemon, page) {
    let hasInsertedFormsTitle = false;
    return pokemon.map((item) => {
      if (page.all && item.isForm && !hasInsertedFormsTitle) {
        hasInsertedFormsTitle = true;
        return `<h3 class="grid-separator">Formes</h3>${renderCard(item)}`;
      }
      return renderCard(item);
    }).join("");
  }

  function renderHuntPage(pagePokemon, owned) {
    const missing = pagePokemon.filter((pokemon) => !state.entries[pokemon.id]?.caught);
    let currentPick =
      missing.find((pokemon) => pokemon.id === state.huntPickId);

    if (!currentPick)
      currentPick = chooseRandomPokemon(missing);
    state.huntPickId = currentPick ? currentPick.id : null;

    el.pageTitle.textContent = "Hunt aleatoire";
    el.pageSubtitle.textContent = missing.length
      ? `${missing.length} shiny encore manquants`
      : "Tous les shiny sont deja renseignes";
    el.progressBar.style.width = pagePokemon.length ? `${(owned / pagePokemon.length) * 100}%` : "0";
    el.ownedCount.textContent = owned;
    el.totalCount.textContent = `/ ${pagePokemon.length} captures`;

    if (!currentPick) {
      el.grid.innerHTML = `<p class="empty-state">Aucun Pokemon manquant a tirer.</p>`;
      return;
    }

    el.grid.innerHTML = `
      <section class="hunt-panel">
        <div class="hunt-copy">
          <p class="eyebrow">Prochaine cible</p>
          <h3>${escapeHtml(currentPick.name)}</h3>
        </div>
        <button id="reroll-hunt" class="primary" type="button">Relancer</button>
      </section>
      <div class="hunt-card">${renderCard(currentPick)}</div>
    `;
    el.grid.querySelector("#reroll-hunt").addEventListener("click", async () => {
      await animateHuntRoll(missing);
      render();
    });
    el.grid.querySelector(".pokemon-card").addEventListener("click", () => openEntry(currentPick.id));
  }

  function chooseRandomPokemon(pokemon) {
    if (!pokemon.length) return null;
    return pokemon[Math.floor(Math.random() * pokemon.length)];
  }

  async function openEntry(id) {
    const pokemon = state.pokemon.find((item) => item.id === id);
    if (!pokemon) return;
    const entry = state.entries[id] || {};
    state.current = pokemon;

    // Reset explicite pour éviter tout résidu d'une ouverture précédente
    el.caught.checked = false;
    el.game.value = "";
    el.method.value = "";
    el.encounters.value = "";
    el.ball.value = "";
    el.gender.value = "";
    el.date.value = "";
    el.date.removeAttribute("value");
    el.origin.disabled = true;

    el.dialogNumber.textContent = `#${String(pokemon.dex).padStart(3, "0")}`;
    el.dialogName.textContent = pokemon.name;
    el.dialogImage.src = pokemon.image;
    el.dialogImage.alt = pokemon.name;

    // Remplissage avec les vraies valeurs
    el.caught.checked = Boolean(entry.caught);
    el.game.value = entry.game || "";
    el.method.value = entry.method || "";
    el.encounters.value = entry.encounters || "";
    el.ball.value = entry.ball || "";
    el.gender.value = entry.gender || "";
    el.date.value = entry.date || "";

    const chain = await fetchEvolutionChain(pokemon);
    buildOriginSelect(chain, pokemon.name, entry.origin || "");

    el.dialog.showModal();
  }

  // Cache pour éviter des requêtes répétées
  const evoCache = new Map();

  async function fetchEvolutionChain(pokemon) {
    if (pokemon.isForm || !pokemon.dex) return [];
    const cacheKey = pokemon.dex;
    if (evoCache.has(cacheKey)) return evoCache.get(cacheKey);
    try {
      const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.dex}/`);
      if (!speciesRes.ok) throw new Error();
      const species = await speciesRes.json();
      const chainRes = await fetch(species.evolution_chain.url);
      if (!chainRes.ok) throw new Error();
      const chainData = await chainRes.json();

      // Collecter tous les slugs de la chaîne
      const slugs = [];
      extractSlugs(chainData.chain, slugs);

      // Récupérer les noms FR pour chaque slug en parallèle
      const names = await Promise.all(slugs.map(async (slug) => {
        try {
          const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${slug}/`);
          if (!res.ok) return slug;
          const data = await res.json();
          return data.names?.find(n => n.language.name === "fr")?.name || slug;
        } catch {
          return slug;
        }
      }));

      evoCache.set(cacheKey, names);
      return names;
    } catch {
      return [];
    }
  }

  function extractSlugs(node, result = []) {
    result.push(node.species.name);
    for (const next of node.evolves_to || []) extractSlugs(next, result);
    return result;
  }

  function normaliseForCompare(str) {
    return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function buildOriginSelect(chain, currentName, savedValue) {
    const currentNorm = normaliseForCompare(currentName);
    const currentIndex = chain.findIndex(n => normaliseForCompare(n) === currentNorm);

    if (currentIndex <= 0) {
      el.origin.innerHTML = `
        <option value="">Non renseignee</option>
        <option value="direct">Obtenu directement (${escapeHtml(currentName)})</option>
      `;
    } else {
      const prevOptions = chain.slice(0, currentIndex).map(name =>
        `<option value="evolved:${escapeHtml(name)}">Evolue depuis ${escapeHtml(name)}</option>`
      ).join("");
      el.origin.innerHTML = `
        <option value="">Non renseignee</option>
        <option value="direct">Obtenu directement (${escapeHtml(currentName)})</option>
        ${prevOptions}
      `;
    }

    el.origin.value = savedValue;
    el.origin.disabled = false;
  }

  function saveCurrentEntry(event) {
    if (!state.current || event.submitter?.value === "cancel") return;
    const id = state.current.id;
    state.entries[id] = {
      caught: el.caught.checked,
      game: el.game.value.trim(),
      method: el.method.value.trim(),
      encounters: el.encounters.value,
      ball: el.ball.value,
      gender: el.gender.value,
      date: el.date.value,
      origin: el.origin.value
    };
    if (!state.entries[id].caught && !hasDetails(state.entries[id])) delete state.entries[id];
    saveEntries();
    render();
  }

  function deleteCurrentEntry() {
    if (!state.current) return;
    delete state.entries[state.current.id];
    saveEntries();
    el.dialog.close();
    render();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state.entries, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "shiny-living-dex.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (imported && typeof imported === "object" && !Array.isArray(imported)) {
          state.entries = imported;
          saveEntries();
          render();
        }
      } catch (error) {
        alert("Le fichier importe n'est pas un JSON valide.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function loadEntries() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
  }

  function hasDetails(entry) {
    return Boolean(entry.game || entry.method || entry.encounters || entry.ball || entry.gender || entry.date || entry.origin);
  }

  function fillSelect(select, values, emptyLabel) {
    select.innerHTML = `
    <option value="">${escapeHtml(emptyLabel)}</option>
    ${values.map(value => `
      <option value="${escapeHtml(value)}">
        ${escapeHtml(value)}
      </option>
    `).join("")}
  `;
  }

  function normaliseSlug(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\u2640/g, "-f")
      .replace(/\u2642/g, "-m")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function guessGeneration(index) {
    if (index <= 151) return 1;
    if (index <= 251) return 2;
    if (index <= 386) return 3;
    if (index <= 493) return 4;
    if (index <= 649) return 5;
    if (index <= 721) return 6;
    if (index <= 809) return 7;
    if (index <= 905) return 8;
    return 9;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  async function animateHuntRoll(missing) {

    const huntCard = document.querySelector(".hunt-card");
    const rerollButton = document.querySelector("#reroll-hunt");

    if (!huntCard || !rerollButton) return;

    rerollButton.disabled = true;
    rerollButton.textContent = "🎲 Tirage...";

    const finalPokemon = chooseRandomPokemon(missing);

    huntCard.classList.add("rolling");

    // durée des changements
    let delay = 45;

    // nombre de pokémon affichés
    for (let i = 0; i < 18; i++) {

      const randomPokemon = missing[Math.floor(Math.random() * missing.length)];

      updateHuntCard(randomPokemon);

      await new Promise(resolve => setTimeout(resolve, delay));

      // ralentissement progressif
      delay += 10;
    }

    // affichage du vrai résultat
    updateHuntCard(finalPokemon);

    huntCard.classList.remove("rolling");
    huntCard.classList.add("revealed");

    setTimeout(() => {
      huntCard.classList.remove("revealed");
    }, 800);

    rerollButton.disabled = false;
    rerollButton.textContent = "Relancer";

    state.huntPickId = finalPokemon.id;
  }

  function updateHuntCard(pokemon) {

    const card = document.querySelector(".hunt-card .pokemon-card");

    if (!card) return;

    const img = card.querySelector("img");
    const name = card.querySelector(".pokemon-name");
    const dex = card.querySelector(".dex-number");

    img.src = pokemon.image;
    img.alt = pokemon.name;

    name.textContent = pokemon.name;

    dex.textContent = "#" + String(pokemon.dex).padStart(3, "0");

    card.dataset.id = pokemon.id;
  }
})();