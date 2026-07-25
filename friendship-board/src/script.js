const boardWrap = document.getElementById('board-wrap');
const bucketInput = document.getElementById('bucket-input');
const bucketDescInput = document.getElementById('bucket-desc-input');
const addBucketBtn = document.getElementById('add-bucket-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const toolbarNote = document.getElementById('toolbar-note');

// each bucket: { id, name, description, friends: [{id, name}] }
// default buckets based on the "Formula of Friendship" point system
// Score = Proximity + Duration + Frequency + Intensity (each rated 1 to 10)
let buckets = [
    {
        id: crypto.randomUUID(),
        name: "Bonus Tier: Significant Others / Lifetime Partners (35+ pts)",
        description: "Highest level of relationship. Maximum shared time, close space, and strong emotional bonds.",
        friends: []
    },
    {
        id: crypto.randomUUID(),
        name: "Close Friends (25 to 34 pts)",
        description: "People you spend real time with outside routine settings, like lunch, clubs, or events. You share personal thoughts and strong emotions.",
        friends: []
    },
    {
        id: crypto.randomUUID(),
        name: "Friends (15 to 24 pts)",
        description: "People you talk to regularly, share light jokes with, and enjoy shared activities. Example: classmates you laugh with before and after class.",
        friends: []
    },
    {
        id: crypto.randomUUID(),
        name: "Acquaintances (10 to 14 pts)",
        description: "People you recognize and talk to a little, but do not hang out with outside that space. Not full friends yet.",
        friends: []
    },
    {
        id: crypto.randomUUID(),
        name: "Strangers (Under 10 pts)",
        description: "People you barely know or pass by. Interaction lasts a few seconds with little to no emotion.",
        friends: []
    }
];

let dragInfo = null; // { friendId, fromBucketId }

function render() {
    boardWrap.innerHTML = "";

    if (buckets.length === 0) {
        const msg = document.createElement('p');
        msg.className = 'board-empty';
        msg.textContent = "No buckets yet. Add one above to start sorting your friends.";
        boardWrap.appendChild(msg);
        return;
    }

    buckets.forEach(bucket => {
        const bucketEl = document.createElement('div');
        bucketEl.className = 'bucket';
        bucketEl.dataset.bucketId = bucket.id;

        const header = document.createElement('div');
        header.className = 'bucket-header';

        const title = document.createElement('div');
        title.className = 'bucket-title';
        title.innerHTML = escapeHtml(bucket.name) + ' <span class="tag-count">(' + bucket.friends.length + ')</span>';

        const delBtn = document.createElement('button');
        delBtn.className = 'del-bucket-btn';
        delBtn.textContent = 'Delete ✕';
        delBtn.addEventListener('click', () => deleteBucket(bucket.id));

        header.appendChild(title);
        header.appendChild(delBtn);

        let descEl = null;
        if (bucket.description) {
            descEl = document.createElement('p');
            descEl.className = 'bucket-desc';
            descEl.textContent = bucket.description;
        }

        const addRow = document.createElement('div');
        addRow.className = 'add-friend-row';
        const friendInput = document.createElement('input');
        friendInput.type = 'text';
        friendInput.placeholder = 'Add friend...';
        friendInput.maxLength = 30;
        const addFriendBtn = document.createElement('button');
        addFriendBtn.textContent = 'Add';
        addFriendBtn.addEventListener('click', () => {
            addFriend(bucket.id, friendInput.value);
            friendInput.value = "";
            friendInput.focus();
        });
        friendInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addFriend(bucket.id, friendInput.value);
                friendInput.value = "";
            }
        });
        addRow.appendChild(friendInput);
        addRow.appendChild(addFriendBtn);

        const list = document.createElement('ul');
        list.className = 'note-list';

        if (bucket.friends.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty-msg';
            empty.textContent = 'Drop a friend here';
            list.appendChild(empty);
        } else {
            bucket.friends.forEach((friend, index) => {
                list.appendChild(buildNoteCard(friend, bucket.id, index));
            });
        }

        // allow dropping into the bucket itself (empty space / end of list)
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            bucketEl.classList.add('bucket-over');
        });
        list.addEventListener('dragleave', () => {
            bucketEl.classList.remove('bucket-over');
        });
        list.addEventListener('drop', (e) => {
            e.preventDefault();
            bucketEl.classList.remove('bucket-over');
            if (!dragInfo) return;
            moveFriend(dragInfo.friendId, dragInfo.fromBucketId, bucket.id, bucket.friends.length);
            dragInfo = null;
        });

        bucketEl.appendChild(header);
        if (descEl) bucketEl.appendChild(descEl);
        bucketEl.appendChild(addRow);
        bucketEl.appendChild(list);
        boardWrap.appendChild(bucketEl);
    });
}

function buildNoteCard(friend, bucketId, index) {
    const li = document.createElement('li');
    li.className = 'note c' + (index % 4);
    li.style.setProperty('--tilt', ((index % 2 === 0 ? -1 : 1) * (1 + (index % 3))) + 'deg');
    li.draggable = true;
    li.dataset.friendId = friend.id;
    li.dataset.bucketId = bucketId;

    const pin = document.createElement('div');
    pin.className = 'pin';

    const name = document.createElement('div');
    name.className = 'note-name';
    name.textContent = friend.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Unpin ✕';
    removeBtn.addEventListener('click', () => removeFriend(bucketId, friend.id));

    li.appendChild(pin);
    li.appendChild(name);
    li.appendChild(removeBtn);

    li.addEventListener('dragstart', (e) => {
        dragInfo = { friendId: friend.id, fromBucketId: bucketId };
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', friend.id);
    });
    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        document.querySelectorAll('.note').forEach(n => n.classList.remove('drag-over'));
        document.querySelectorAll('.bucket').forEach(b => b.classList.remove('bucket-over'));
    });
    li.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        li.classList.add('drag-over');
    });
    li.addEventListener('dragleave', () => {
        li.classList.remove('drag-over');
    });
    li.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        li.classList.remove('drag-over');
        if (!dragInfo) return;
        moveFriend(dragInfo.friendId, dragInfo.fromBucketId, bucketId, index);
        dragInfo = null;
    });

    return li;
}

function findBucket(bucketId) {
    return buckets.find(b => b.id === bucketId);
}

function addBucket() {
    const name = bucketInput.value.trim();
    if (!name) return;
    const description = bucketDescInput.value.trim();
    buckets.push({ id: crypto.randomUUID(), name, description, friends: [] });
    bucketInput.value = "";
    bucketDescInput.value = "";
    bucketInput.focus();
    render();
}

function deleteBucket(bucketId) {
    buckets = buckets.filter(b => b.id !== bucketId);
    render();
}

function addFriend(bucketId, rawName) {
    const name = rawName.trim();
    if (!name) return;
    const bucket = findBucket(bucketId);
    if (!bucket) return;
    bucket.friends.push({ id: crypto.randomUUID(), name });
    render();
}

function removeFriend(bucketId, friendId) {
    const bucket = findBucket(bucketId);
    if (!bucket) return;
    bucket.friends = bucket.friends.filter(f => f.id !== friendId);
    render();
}

function moveFriend(friendId, fromBucketId, toBucketId, targetIndex) {
    const fromBucket = findBucket(fromBucketId);
    const toBucket = findBucket(toBucketId);
    if (!fromBucket || !toBucket) return;

    const srcIndex = fromBucket.friends.findIndex(f => f.id === friendId);
    if (srcIndex === -1) return;

    const [moved] = fromBucket.friends.splice(srcIndex, 1);

    let insertAt = targetIndex;
    if (fromBucketId === toBucketId && srcIndex < targetIndex) {
        insertAt -= 1;
    }
    insertAt = Math.max(0, Math.min(insertAt, toBucket.friends.length));

    toBucket.friends.splice(insertAt, 0, moved);
    render();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function exportData() {
    const payload = {
        type: "friendship-board-save",
        exportedAt: new Date().toISOString(),
        buckets: buckets
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.download = "friendship-board-" + dateStamp + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNote("Saved! Check your Downloads folder for the .json file.");
}

function importData(file) {
    if (!file) return;
    const reader = new FileReader();

    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            const importedBuckets = Array.isArray(data.buckets) ? data.buckets : data;

            if (!Array.isArray(importedBuckets)) {
                showNote("This file does not look like a friendship board save.", true);
                return;
            }

            // rebuild with fresh ids so nothing clashes, but keep names/descriptions/friends
            buckets = importedBuckets.map(b => ({
                id: crypto.randomUUID(),
                name: typeof b.name === 'string' ? b.name : "Untitled Bucket",
                description: typeof b.description === 'string' ? b.description : "",
                friends: Array.isArray(b.friends)
                    ? b.friends.map(f => ({ id: crypto.randomUUID(), name: typeof f.name === 'string' ? f.name : "" })).filter(f => f.name)
                    : []
            }));

            render();
            showNote("Board loaded from file.");
        } catch (err) {
            showNote("Could not read that file. Make sure it is a .json file exported from this app.", true);
        }
    };

    reader.onerror = () => {
        showNote("There was a problem reading that file.", true);
    };

    reader.readAsText(file);
}

function showNote(text, isError) {
    toolbarNote.textContent = text;
    toolbarNote.style.color = isError ? "#ff8a8a" : "#b39c7d";
    clearTimeout(showNote._t);
    showNote._t = setTimeout(() => {
        toolbarNote.textContent = "Export saves your board as a .json file on your computer. Import loads a board back from that file.";
        toolbarNote.style.color = "#b39c7d";
    }, 4000);
}

exportBtn.addEventListener('click', exportData);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    importData(file);
    importFile.value = "";
});

addBucketBtn.addEventListener('click', addBucket);
bucketInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBucket();
});
bucketDescInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addBucket();
});

render();