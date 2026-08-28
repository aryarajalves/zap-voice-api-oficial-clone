/**
 * Scripts interativos do cliente para navegação em abas por data,
 * alternância de visualização (Chat vs QA) e filtros de status.
 */

export const EXPORT_CLIENT_JS = `
    var currentMainView = 'chat';
    var currentDateTab = 'all';
    var isHidingPrivateNotes = false;
    var currentQaStatus = 'all';

    function switchMainView(viewName) {
        currentMainView = viewName;

        var navBtns = document.querySelectorAll('.nav-tab-btn');
        navBtns.forEach(function(btn) {
            if (btn.getAttribute('data-view') === viewName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        var convoBody = document.getElementById('conversation-body');
        var dateTabs = document.getElementById('date-tabs-container');
        var qaWrapper = document.getElementById('qa-panel-wrapper');
        var privateFilter = document.getElementById('filter-private-container');

        if (viewName === 'chat') {
            if (convoBody) convoBody.style.display = 'block';
            if (dateTabs) dateTabs.style.display = 'block';
            if (qaWrapper) qaWrapper.style.display = 'none';
            if (privateFilter) privateFilter.style.display = 'inline-flex';
        } else if (viewName === 'qa') {
            if (convoBody) convoBody.style.display = 'none';
            if (dateTabs) dateTabs.style.display = 'none';
            if (qaWrapper) qaWrapper.style.display = 'block';
            if (privateFilter) privateFilter.style.display = 'none';
        }
    }

    function filterQaStatus(status) {
        currentQaStatus = status;

        var filterBtns = document.querySelectorAll('.qa-filter-btn');
        filterBtns.forEach(function(btn) {
            if (btn.getAttribute('data-status') === status) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        var cards = document.querySelectorAll('.qa-card');
        cards.forEach(function(card) {
            var cStatus = card.getAttribute('data-qa-status');
            if (status === 'all' || cStatus === status) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    function selectDateTab(dateKey) {
        currentDateTab = dateKey;
        
        var tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(function(btn) {
            if (btn.getAttribute('data-date') === dateKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        var groups = document.querySelectorAll('.date-group');
        groups.forEach(function(group) {
            var gDate = group.getAttribute('data-date');
            if (dateKey === 'all' || gDate === dateKey) {
                group.style.display = 'block';
            } else {
                group.style.display = 'none';
            }
        });
    }

    function togglePrivateNotes(shouldHide) {
        isHidingPrivateNotes = shouldHide;
        if (shouldHide) {
            document.body.classList.add('hide-private-notes');
        } else {
            document.body.classList.remove('hide-private-notes');
        }
    }

    function toggleThought(id) {
        var el = document.getElementById(id);
        if (!el) return;
        var btn = el.previousElementSibling;
        if (el.style.display === 'none' || !el.style.display) {
            el.style.display = 'block';
            if (btn) {
                btn.classList.add('active');
                var chevron = btn.querySelector('.thought-chevron');
                if (chevron) chevron.textContent = '▲';
                var txt = btn.querySelector('.thought-btn-label');
                if (txt) {
                    txt.textContent = txt.textContent.replace('Ver Pensamento', 'Ocultar Pensamento');
                }
            }
        } else {
            el.style.display = 'none';
            if (btn) {
                btn.classList.remove('active');
                var chevron = btn.querySelector('.thought-chevron');
                if (chevron) chevron.textContent = '▼';
                var txt = btn.querySelector('.thought-btn-label');
                if (txt) {
                    txt.textContent = txt.textContent.replace('Ocultar Pensamento', 'Ver Pensamento');
                }
            }
        }
    }
`;
