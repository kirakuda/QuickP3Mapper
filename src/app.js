// # These variables grab the HTML elements from the page so we can change their content.
const grid = document.getElementById('grid'), gantt = document.getElementById('gantt'), gRows = document.getElementById('g-rows'), gYears = document.getElementById('g-years'), tip = document.getElementById('tip');

// # GLOBAL DATA CONTAINERS
// # These will hold the information we fetch from the database.
let rawData = []; // # Stores all trial records.
let companyMap = {}; // # Stores the professional names and tickers for companies.
let cancerGroups = []; // # Stores the list of oncology categories (e.g., Lung Cancer).
let companyColors = {}; // # Cache for dynamic company colors.

// # CURRENT STATE OF THE DASHBOARD
// # This keeps track of what the user is currently searching for or filtering.
let filters = { s: '', co: 'all', da: 'all', ind: '', v: 'grid', role: 'all' };

// # TOOL: Get Company Details
// # This helper function looks up a company in the map to find its professional name and ticker.
function getCompanyDetails(co) {
    return companyMap[co] || { name: co, ticker: co };
}

// # TOOL: Get Ticker
// # This helper function returns just the short ticker symbol for a company.
function getTicker(co) {
    const details = getCompanyDetails(co);
    return details.ticker;
}

// # COMPONENT: Company List Generator
// # This function scans the data and pulls out the names of the companies.
// # It then populates the "Sponsor" dropdown menu on the page.
function populateCompanyList() {
    const coSelect = document.getElementById('f-co'); // # Find the dropdown box on the page.
    if (!coSelect) return;

    // # Create a list of unique company names from the raw trials data.
    const companies = [...new Set(rawData.map(d => d.actual_company))].sort();

    // # Reset the dropdown menu with a default "All" option.
    coSelect.innerHTML = '<option value="all">All Organizations</option>';

    // # For each company in our list, create a clickable option in the dropdown.
    companies.forEach(company => {
        const details = getCompanyDetails(company);
        const option = document.createElement('option');
        option.value = company; // # Hidden ID for filtering.
        option.textContent = `${details.name} (${details.ticker})`; // # What the user SEES.
        coSelect.appendChild(option);
    });
}

// # HELPER: Verify Top 20
// # This is now pre-filtered in Python, but we keep this for additional UI safety.
function isTop20(company) {
    if (!company) return false;
    return !!companyMap[company];
}

function generateCompanyColor(company) {
    if (companyColors[company]) return companyColors[company];
    // Generate a consistent, professional muted color based on the company string
    let hash = 0;
    for (let i = 0; i < company.length; i++) {
        hash = company.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Constrain Hue (0-360), Saturation (30-60% for professional look), Lightness (40-60% for contrast)
    const h = Math.abs(hash % 360);
    const s = 30 + (Math.abs(hash) % 30);
    const l = 40 + (Math.abs(hash) % 20);

    const color = `hsl(${h}, ${s}%, ${l}%)`;
    companyColors[company] = color;
    return color;
}

function getCls(n) { return 'dynamic-co'; } // Deprecated, kept for safety but using inline styles now

// # REMOVED: getMajorCategory logic. 
// # This now happens in Python to protect your IP.
// # The dashboard now simply reads "major_category" directly from the JSON.

function render() {
    const search = filters.s.toLowerCase().trim();
    const indSearch = filters.ind.toLowerCase().trim();

    // DEFAULT STATE: No study at default.
    // Show studies only if: Quick Search has text, OR Sponsor is selected, OR Indication is selected (list or typed)
    const isDefaultState = !search && filters.co === 'all' && (!indSearch && filters.da === 'all');

    if (isDefaultState) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:10rem; font-size:1.5rem; color:var(--text-dim);">Please initiate a search or select a filter to view the pipeline.</div>';
        gRows.innerHTML = '';
        gYears.innerHTML = '';
        document.getElementById('stat-assets').textContent = '0';
        document.getElementById('stat-p3').textContent = '0';
        return;
    }

    // Filter trails based on user input.
    const data = rawData.filter(i => {
        const iTitle = (i.title || '').toLowerCase();
        const iInd = (i.indications || '').toLowerCase();
        const iCo = i.actual_company || '';
        const iImp = (i.imp || '').toLowerCase();

        // # IP PROTECTION IN ACTION:
        // # Instead of running complex logic here, we just check the "is_malignancy" 
        // # flag that Python calculated for us privately.
        const matchArea = filters.da === 'all' ||
            (filters.da === 'oncology' && i.is_malignancy) ||
            (filters.da === 'non-oncology' && !i.is_malignancy);

        // # SMART FILTER: Check if the trial matches the Indication searched.
        let matchInd = true;
        if (indSearch) {
            // # Check if the pre-calculated category (Lung Cancer, etc.) matches the search.
            const itemGroup = (i.major_category || 'Other').toLowerCase();
            const groupMatch = itemGroup.includes(indSearch);
            // # Also check if the raw text matches for maximum flexibility.
            const textMatch = iInd.includes(indSearch) || iTitle.includes(indSearch);
            matchInd = groupMatch || textMatch;
        }

        // # SPONSOR FILTER: Match the specific pharma selected.
        const mc = filters.co === 'all' || iCo === filters.co;

        // # ROLE FILTER: Lead vs Collaborator.
        const matchRole = filters.role === 'all' ||
            (filters.role === 'lead' && !i.is_collaborator) ||
            (filters.role === 'collab' && i.is_collaborator);

        // # SEARCH FILTER: Check title, ID, and indications for keywords.
        const ms = !search ||
            iTitle.includes(search) ||
            (i.nct_id && i.nct_id.toLowerCase().includes(search)) ||
            iInd.includes(search);

        // # TIMELINE VALIDATION: Ensure trial completion dates are logical for the view.
        const eDate = i.completion_date_iso ? new Date(i.completion_date_iso) : null;
        const s_Date = i.start_date_iso ? new Date(i.start_date_iso) : null;
        const rStart = new Date('2020-01-01'), rEnd = new Date('2032-12-31');
        const visibleInTimeline = !eDate || (eDate >= rStart && s_Date <= rEnd);

        return matchArea && matchInd && mc && matchRole && ms && visibleInTimeline;
    });

    const stats = calculateStats(data);
    document.getElementById('stat-assets').textContent = stats.assets;
    document.getElementById('stat-p3').textContent = stats.p3;

    if (filters.v === 'grid') { grid.style.display = 'grid'; gantt.style.display = 'none'; renderGrid(data); }
    else { grid.style.display = 'none'; gantt.style.display = 'block'; renderGantt(data); }
}

// # COMPONENT: Indication Suggestions
// # This populates the autocomplete list for the indication filter.
function populateIndicationList() {
    const dl = document.getElementById('indication-list');
    const allInds = new Set();

    // # Add the major cancer groups stored in our JSON metadata.
    cancerGroups.forEach(g => allInds.add(g));

    // # Add specific indications found in the trials.
    rawData.forEach(d => {
        if (d.indications) d.indications.split(',').forEach(i => allInds.add(i.trim()));
    });

    dl.innerHTML = Array.from(allInds).sort().map(i => `<option value="${i}">`).join('');
}

function calculateStats(data) {
    return {
        assets: data.length,
        p3: data.filter(d => d.phase.includes('PHASE3')).length
    };
}

function renderGrid(data) {
    grid.innerHTML = data.length ? '' : '<div style="grid-column:1/-1; text-align:center; padding:15rem; font-size:2rem; font-weight:950; color:var(--text-dim);">No Assets Found.</div>';
    data.forEach(i => {
        const details = getCompanyDetails(i.actual_company);
        const color = generateCompanyColor(i.actual_company);
        const rd = i.readout_summary ? `<div class="readout"><span class="intel-tag">Asset Intel</span>${i.readout_summary}${i.source_url ? `<a href="${i.source_url}" target="_blank" style="display:block; margin-top:1.25rem; color:var(--primary); font-weight:950; text-decoration:none;">View Official PR →</a>` : ''}</div>` : '';
        const d = document.createElement('div'); d.className = 'card';
        // # Dynamic name color using the professional name from metadata.
        d.innerHTML = `
            <div class="company" style="text-transform:uppercase; margin-bottom:1.5rem; color:${color}; text-shadow:0 0 15px ${color}40;">
                ${details.name} <span style="font-size:0.8rem; opacity:0.75;">(${i.is_collaborator ? 'Collab' : 'Lead'})</span>
            </div>
            <div style="font-size:1.8rem; font-weight:950; color:#fff; margin-bottom:2rem; line-height:1.3; letter-spacing:-0.04em;">${i.title}</div>
            <div style="margin-bottom:2.5rem; display:flex; gap:1.5rem; align-items:center; flex-wrap:wrap;">
                <span class="p-badge">${i.phase}</span>
                <a href="https://clinicaltrials.gov/study/${i.nct_id}" target="_blank" class="nct-link" style="font-size:1.1rem;">${i.nct_id}</a>
            </div>
            ${rd}
            <div style="margin-top:2.5rem; padding-top:2rem; border-top:2px solid var(--glass-border);">
                <p style="margin-bottom:0.8rem;"><span class="label" style="font-size:0.75rem;">Pipeline IMP:</span> <b style="color:#fff; font-weight:950;">${i.imp || 'Pipeline Targeted'}</b></p>
                <p style="margin-bottom:0.8rem;"><span class="label" style="font-size:0.75rem;">Enrollment:</span> <b style="color:#fff; font-weight:950;">N: ${i.sample_size}</b> <span class="status-label">${i.enrollment_type === 'A' ? '(Actual)' : '(Estimated)'}</span></p>
                <p style="margin-bottom:0.8rem;"><span class="label" style="font-size:0.75rem;">Study Start:</span> <b style="color:#fff; font-weight:950;">${formatDate(i.start_date_iso)}</b> <span class="status-label">${i.start_date_type === 'A' ? '(Actual)' : '(Estimated)'}</span></p>
                <p style="margin-bottom:0.8rem;"><span class="label" style="font-size:0.75rem;">Primary Readout:</span> <b style="color:#fff; font-weight:950;">${formatDate(i.primary_completion_date_iso)}</b> <span class="status-label">${i.primary_completion_date_type === 'A' ? '(Actual)' : '(Estimated)'}</span></p>
                <p><span class="label" style="font-size:0.75rem;">Study End:</span> <b style="color:#fff; font-weight:950;">${formatDate(i.completion_date_iso)}</b> <span class="status-label">${i.completion_date_type === 'A' ? '(Actual)' : '(Estimated)'}</span></p>
            </div>
        `;
        grid.appendChild(d);
    });
}

// Core function to render the Time Mapper (Gantt Chart) view.
function renderGantt(data) {
    // Collect all trial dates to determine the chart's overall time scope.
    const dates = []; data.forEach(d => { if (d.start_date_iso) dates.push(new Date(d.start_date_iso)); if (d.completion_date_iso) dates.push(new Date(d.completion_date_iso)); });
    if (!dates.length) return; // Exit if no trials have date information.

    // Define the fixed window for the timeline (Jan 2020 to Dec 2032).
    const rangeStart = new Date('2020-01-01'), rangeEnd = new Date('2032-12-31');
    const range = rangeEnd - rangeStart;

    // Refresh the year headers at the top of the chart.
    gYears.innerHTML = '';
    // Update the top-left label cell to describe the stacked data in the frozen left column.
    const gLabels = document.querySelector('.g-labels');
    if (gLabels) gLabels.innerHTML = 'Ticker<br>NCT ID<br>Disease';

    for (let y = rangeStart.getFullYear(); y <= rangeEnd.getFullYear(); y++) {
        const yr = document.createElement('div');
        yr.className = 'year';
        yr.textContent = y;
        gYears.appendChild(yr);
    }
    const yrEl = document.getElementById('g-years');
    if (yrEl) yrEl.style.position = 'relative'; // Support markers
    gRows.style.position = 'relative'; // Support markers
    gRows.innerHTML = '';

    data.forEach(i => {
        const color = generateCompanyColor(i.actual_company);
        const s = new Date(i.start_date_iso), e = new Date(i.completion_date_iso), p = new Date(i.primary_completion_date_iso);
        let bar = '', marker = '';

        if (s && e && e > rangeStart && s < rangeEnd) {
            // Clip to visible range
            const start = Math.max(s, rangeStart);
            const end = Math.min(e, rangeEnd);

            const l = ((start - rangeStart) / range) * 100;
            const w = ((end - start) / range) * 100;

            // Bar shaping: Square ends if clipped, Round if within bounds
            const brL = s < rangeStart ? '0' : '20px';
            const brR = e > rangeEnd ? '0' : '20px';

            // Dynamic bar color
            bar = `<div class="bar" style="left:${l}%; width:${w}%; background:${color}; box-shadow:0 0 10px ${color}60; border-radius:${brL} ${brR} ${brR} ${brL};" 
                        onmouseover="showTip(event, \`${i.actual_company}\`, \`${i.title.replace(/'/g, "\\'")}\`, '${i.start_date_iso}', '${i.completion_date_iso}', \`${(i.readout_summary || '').replace(/'/g, "\\'")}\`, '${i.readout_source}', '${i.primary_completion_date_iso}', '${i.primary_completion_date_type}')" 
                        onmouseout="hideTip()">N:${i.sample_size}</div>`;

            if (p >= start && p <= end) {
                const pl = ((p - rangeStart) / range) * 100;
                marker = `<div class="marker" style="left:${pl}%; border-color:${i.primary_completion_date_type === 'A' ? '#10b981' : '#fff'}" ${i.source_url ? `onclick="window.open('${i.source_url}', '_blank')"` : ''}></div>`;
            }
        }
        const r = document.createElement('div'); r.className = 'g-row';
        const details = getCompanyDetails(i.actual_company);
        const ticker = details.ticker;
        const role = i.is_collaborator ? 'Collab' : 'Lead';
        r.innerHTML = `<div class="g-info">
            <div class="company" style="color:${color}; text-shadow:0 0 10px ${color}40; margin-bottom: 0.05rem; line-height:1; font-size: 1.0rem;">
                ${ticker} <span style="font-size:0.8rem; opacity:0.6; font-weight:400; text-transform:uppercase;">(${role})</span>
            </div>
            <div class="g-meta" style="line-height:1; max-width:140px;">
                <a href="https://clinicaltrials.gov/study/${i.nct_id}" target="_blank" class="nct-link" style="display:block; font-size: 1.0rem; font-weight:400;">${i.nct_id}</a>
                <div style="font-size: 1.0rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:0.7; max-width:140px;">${i.indications.split(',')[0]}</div>
            </div>
        </div><div class="g-bar-cell">${bar}${marker}</div>`;
        gRows.appendChild(r);
    });

}

function showTip(e, co, ti, s, comp, rd, src, p_date, p_type) {
    tip.style.opacity = '1';
    const readout = rd ? `<div style="margin-top:1.5rem; padding-top:1.5rem; border-top:2px solid rgba(255,255,255,0.1);"><span class="intel-tag">Asset Intel</span><div style="font-size:1.1rem; font-weight:600; color:#bfdbfe; line-height:1.6;">${rd}</div><div style="text-align:right; font-size:0.85rem; color:var(--text-dim); font-style:italic; margin-top:1rem;">— ${src}</div></div>` : '';
    const p_status = p_type === 'A' ? '<span style="color:var(--color-actual); font-size:0.8rem;">(Actual)</span>' : '<span style="color:var(--color-estimated); font-size:0.8rem;">(Estimated)</span>';
    const color = generateCompanyColor(co);

    tip.innerHTML = `
        <div class="company" style="font-size:1.4rem; margin-bottom:1rem; color:${color};">${co}</div>
        <div style="font-weight:950; font-size:1.25rem; color:#fff; line-height:1.4; margin-bottom:1.5rem;">${ti}</div>
        <div style="display:flex; flex-direction:column; gap:0.5rem; padding:1.5rem; background:rgba(255,255,255,0.08); border-radius:1.5rem; font-weight:800; font-size:1.1rem;">
            <div>Trial Span: <span style="color:#fff">${s}</span> to <span style="color:#fff">${comp}</span></div>
            <div>Primary Readout: <span style="color:#fff">${p_date}</span> ${p_status}</div>
        </div>
        ${readout}`;
    moveTip(e);
}
function formatDate(d) { if (!d) return 'TBD'; return d; }
function hideTip() { tip.style.opacity = '0'; }
function moveTip(e) {
    let x = e.pageX + 40, y = e.pageY + 40; tip.style.left = x + 'px'; tip.style.top = y + 'px';
    const rect = tip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth - 50) tip.style.left = (e.pageX - rect.width - 40) + 'px';
    if (y + rect.height > window.innerHeight + window.scrollY - 50) tip.style.top = (e.pageY - rect.height - 40) + 'px';
}

// # COMPONENT: Data Fetcher
// # This is the "Engine Start" button. It fetches the JSON dataset from the server.
fetch('data/readouts_pureP3.json')
    .then(response => response.json())
    .then(payload => {
        // # We receive a single object with "metadata" and "trials".
        rawData = payload.trials; // # Store the trial list.
        companyMap = payload.metadata.company_map; // # Store the company names and tickers.
        cancerGroups = payload.metadata.cancer_groups; // # Store the category names.

        // # Once the data is loaded, we initialize the UI components.
        populateIndicationList(); // # Suggestions for Indication search.
        populateCompanyList(); // # Sponsor dropdown menu.
        render(); // # Final rendering of the dashboard.
    })
    .catch(error => console.error('Error loading data:', error));


document.getElementById('s-in').addEventListener('input', e => { filters.s = e.target.value; render(); });
document.getElementById('f-da').addEventListener('change', e => { filters.da = e.target.value; render(); });
document.getElementById('f-role').addEventListener('change', e => { filters.role = e.target.value; render(); });
document.getElementById('f-ind').addEventListener('input', e => { filters.ind = e.target.value; render(); });
document.getElementById('f-co').addEventListener('change', e => { filters.co = e.target.value; render(); });
// Target Asset logic removed
document.querySelectorAll('.view-btn').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.view-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); filters.v = b.dataset.v; render(); }));
document.addEventListener('mousemove', e => { if (tip.style.opacity === '1') moveTip(e); });
