// Journal storage as read-modify-write against the live store, so a stale tab
// never overwrites entries added or deleted in another tab.
const KEY = 'dreamJournal';

export function readJournal(storage) {
    const saved = storage.getItem(KEY);
    const list = saved ? JSON.parse(saved) : [];
    return Array.isArray(list) ? list : [];
}

function write(storage, list) {
    try { storage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
}

// Returns { list, saved }. On an unreadable store, falls back to the in-memory list.
export function addEntry(storage, entry, memory = []) {
    let list;
    try { list = readJournal(storage); } catch (e) { list = memory; }
    list = [entry, ...list.filter(e => e.id !== entry.id)];
    return { list, saved: write(storage, list) };
}

export function removeEntry(storage, id, memory = []) {
    let list;
    try { list = readJournal(storage); } catch (e) { list = memory; }
    list = list.filter(e => e.id !== id);
    return { list, saved: write(storage, list) };
}
