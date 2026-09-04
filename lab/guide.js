/* ─── THE HELP GNOME ───────────────────────────────────────────────────────
   A confused-looking gnome stands in the corner of every gizmo. He doesn't
   know how the thing works either, but he has read the label — click him and
   he says what it does in a speech bubble. One bubble open at a time; escape,
   a click outside, or another gnome closes it. */

window.Guide = (function () {
  const HELP = {
    forge: {
      title: 'the spawn-o-matic mk.ii',
      lead: 'a picture goes in, a small creature comes out and walks off onto the bench. the creature <em>is</em> your picture — read, cut out and pixelated. it is all steam and noise, but nothing is uploaded; it happens on this device.',
      steps: [
        ['01 intake hopper', 'drop a png or jpg on the hopper, click it to browse, or press <b>use a sample</b> — that hands you a gnome, a different sort each press. <b>eject</b> empties it.'],
        ['the three dials', 'the machine reads the pixels: the main hue, how busy it is (chaos) and how bright (lumen). drag a needle to overrule what the picture said, double-click it to hand it back, <b>auto</b> to hand them all back. the big dial on the boiler is decoration and only ever says "hot".'],
        ['detail', 'how many cells across the creature is cut at — lo 24 → ex 100. lo is a few big cells carrying the whole character; ex is near enough the photograph you fed in.'],
        ['pull the lever', 'the big red one. the machine chugs, the belt runs, the stacks blow, and 02 the spawn chamber lights up with what came out. pull it again to re-roll just the face and limbs — the body stays yours.'],
        ['what came out', 'a name and four stats. type over the name, ⟳ rolls another, <b>save png</b> writes it out. <b>SIZE</b> sets how big it walks the bench, half to double.'],
        ['03 warp bench', 'the plank under the machine bends every creature it has made — stretch, lean, wave, melt, twist, bulge, glitch, blur. double-click a slider to flatten it, <b>flat</b> for the lot, <b>shake</b> to scramble them.'],
        ['the boiler', 'the tall thing on the left with the fire in it. drag a critter off the bench into it and it goes up as fuel; press it to send the whole herd in at once. <b>reset</b> puts the machine back to how it came out of the crate.']
      ],
      tip: 'clean, flat backdrops cut out best. busy photos come out as confetti — which is sometimes the point.'
    },
    petition: {
      title: 'the ballot-o-tron 3000',
      lead: 'put a daft question to the hill, then vote on it the proper way: mark a paper ballot and <em>post it into the machine</em>. if enough people say yes it stops being a poll result and becomes a thing — dug into the hill and written into the law book.',
      steps: [
        ['01 the issue', 'whatever is on the reader. the machine works through the open questions one at a time; <b>next issue →</b> moves it on, or press <b>put it on the machine</b> on any card down on the board.'],
        ['02 the ballot', 'tick YES or NO. the ballot lifts and glows once it is marked, which is the machine telling you it will now accept it.'],
        ['posting it', 'grab the ballot and <b>drag it into the slot</b> — the whole point of the thing. the slot also takes a plain click, if you would rather not drag. one ballot per question; post another to change your mind, or post the same way twice to take your vote back.'],
        ['03 the tally screen', 'the machine counts for a moment, then prints where the question stands, how far it is from <b>the line</b>, and which way you voted. if your ballot was the one that carried it, the screen says so — and the hill is dug and the law book written before you have finished reading.'],
        ['05 the board', 'everything pinned, with its tally. asking is here too: type a question and pin it. if the owner has pre-review on, a moderator reads it first.'],
        ['digging', 'what gets dug depends on the words you used: pond, tree, flag, bench, sign, or a plain stone if the hill cannot tell. ponds get named — see the naming ceremony.'],
        ['who can do what', 'a <b>user</b> asks, posts ballots and reads. a <b>moderator</b> sees the review queue, can close a vote early or take a question down. the <b>owner</b> also sets the line, digs and drains, and stirs the hill.']
      ],
      tip: 'the hill in the corner of this machine is the same hill the shed screws things to. dig something here and it turns up over there.'
    },
    shed: {
      title: 'the workshop shed',
      lead: 'the roadmap, except it is a shed. no dates, no quarters — just how far along a thing looks.',
      steps: [
        ['the shed', 'whatever is being built sits on the workbench as a half-finished contraption and gains parts as it gets closer to done.'],
        ['the tarps', 'anything further out is a lump under a tarp with a question mark on it. that is all a tarp will ever tell you.'],
        ['the roadmap', 'the same things as cards: bench, tarp or shipped, with a progress bar for the ones on the bench.'],
        ['shipping', 'when a thing ships the gnome carries it out the door and screws it to the hill, where it stays.'],
        ['who can do what', 'a <b>user</b> sees the shed and tarps stay tarps. a <b>moderator</b> can peek under a tarp and leave a note. the <b>owner</b> adds things, slides progress, moves them bench ⇄ tarp, ships and scraps.']
      ],
      tip: 'hover anything on the hill to hear what it is called.'
    },
    museum: {
      title: 'the museum',
      lead: 'the hill draws, the hill votes, and each cycle exactly one drawing is <em>preserved</em> — framed, varnished, hung on the wall for good. everything else gets built over. that is the whole arrangement.',
      steps: [
        ['01 the easels', 'this cycle\'s drawings, each on its own little easel with a title, a signature and a star. tap the star to vote for it; tap it again to take the vote back. one vote per drawing, per device.'],
        ['02 submit', 'draw on the pad, name it, sign it or don\'t — unsigned work goes down as <b>anonymous</b>. blank paper is refused. the easel has standards, even if nobody else does.'],
        ['03 the wall', 'the permanent collection. everything framed here won its cycle and can never be taken down. the brass plaque says what, who and which cycle.'],
        ['closing a cycle', 'the owner closes it: the top-voted drawing gets the varnish (a tie goes to whichever arrived first), the rest fade where they stand, and the quiet count under the wall goes up by that many.'],
        ['who can do what', 'a <b>user</b> draws, signs and votes. a <b>moderator</b> can take a drawing down off its easel before the vote settles anything. the <b>owner</b> closes the cycle, and can dust the whole museum back to nothing.'],
        ['the count', '<b>built over: N works</b>, under the wall. nobody remembers what they were. that is rather the point.']
      ],
      tip: 'votes only matter until the cycle closes. after that, the wall is the wall.'
    },
    naming: {
      title: 'the naming ceremony',
      lead: 'when a new landmark turns up on the hill it gets a ceremony: names are put forward, votes are cast, and the first name to reach <em>the line</em> sticks. forever. the pond, for the record, is called Greg.',
      steps: [
        ['the ballot', 'every unnamed landmark gets a card — what it is, the names put forward so far, and how far the front-runner is from the line. four show at a time; the rest wait their turn.'],
        ['proposing', 'type a name — 24 letters at most, the plate is small — and <b>put it forward</b>. putting a name forward takes your vote with it. proposing a name that\'s already up just votes for it.'],
        ['voting', 'one vote per landmark per device. tap another name and your vote walks over; tap your own again to take it back. the moment a name reaches the line it carries, and henceforth it shall be called that.'],
        ['the hill', 'hover a landmark and it answers. the named ones give their name first; the unnamed ones just describe what happened to them.'],
        ['the register', 'every name that ever carried, newest first. nothing un-names — even if the landmark itself is later drained, the register remembers.'],
        ['who can do what', 'a <b>user</b> proposes and votes. a <b>moderator</b> can <b>strike</b> a name off a ballot — it stays up, crossed out, unvotable. the <b>owner</b> sets the line, can <b>christen</b> a name straight through, and can make the hill mutter: one to three stray votes turn up, with opinions.']
      ],
      tip: 'this is the same hill the petitions dig and the shed ships to. name a thing here and every hill on the bench will answer with it.'
    },
    elections: {
      title: 'the elections',
      lead: 'once a month the hill elects a mayor from whoever stands. the winner gets the pink sash and wanders the page for a 30-day term. <em>powers: none. duties: wandering.</em>',
      steps: [
        ['01 the office', 'whoever holds it: portrait, sash, slogan, and a term bar counting day such-and-such of 30. when nobody holds it the sash hangs on its nail and the office stands empty.'],
        ['02 the race', 'the ballot. press <b>vote</b> to back a candidate — you get one vote across the whole race, and it moves with you if you change your mind. tap it again to take it back.'],
        ['03 standing', 'a name, a modest promise, and <b>stand for mayor</b>. one candidacy per device — after that the form admits you\'re on the ballot, and there is no dignified way off it.'],
        ['the count', 'when the term runs out the ballots count themselves: most votes wins, ties go to whoever stood first. if nobody stood, the incumbent stays on, grumbling, for another 30 days.'],
        ['the wanderer', 'while anyone holds office a small sashed gnome ambles about the bench. hover it to be reminded who, and for how much longer. the lawn gnome on the hill wears the sash too.'],
        ['who can do what', 'a <b>user</b> votes and stands. a <b>moderator</b> can strike a candidate off the ballot, or pardon them back on. the <b>owner</b> counts the ballots early, dissolves the office, and can make the hill turn out to vote.']
      ],
      tip: 'the mayor cannot help you. the mayor cannot help anyone. that is rather the point of the office.'
    },
    lawbook: {
      title: 'the law book',
      lead: 'every petition that carries is written into a slightly absurd constitution. new visitors can read the hill\'s whole legislative history, which is also, if you squint, a <em>changelog</em>.',
      steps: [
        ['the left page', 'the law of the hill. every question that carried becomes an <b>Article</b>, in order, each closed with the clause its kind demands — a pond is damp in perpetuity, a flag flaps as it sees fit.'],
        ['the right page', 'the changelog. everything that ever happened, newest first: <b>§</b> carried, <b>✕</b> repealed, <b>✦</b> shipped from the shed and screwed to the hill. release notes, for a lawn.'],
        ['repeals', 'drain a pond on the petition board and its Article stays in the book, struck through. the law does not forget — it just crosses things out.'],
        ['the wax seal', 'the owner can press the red wax to stamp the book. it changes nothing, legally. it is extremely satisfying.'],
        ['who can do what', 'a <b>user</b> reads. a <b>moderator</b> keeps the margins tidy, which is a calling rather than a button. the <b>owner</b> applies the seal.'],
        ['where it comes from', 'the book writes itself — it watches the petition board and the workshop shed. it has no opinions, only records.']
      ],
      tip: 'pass a petition next door and watch the Article appear here on its own. the book is always listening. legally.'
    },
    monument: {
      title: 'the monument',
      lead: 'a stone gnome too big for anyone to build alone. nobody votes on it — it goes up one block at a time, and only if <em>enough different people</em> each bother to lay one.',
      steps: [
        ['the site', 'the dashed outline is the plan — a great stone gnome, boots first, hat last. hover any laid block to see whose it is and how long it has sat there.'],
        ['your block', 'write your mark (or don\'t — the ledger just says <b>a passing gnome</b>) and press <b>place your block</b>. one block per shift. no exceptions, not even the owner.'],
        ['shifts', 'a shift is everyone getting one block each. the owner can <b>call the next shift</b>, and a shift left out for more than a day goes stale — the next visitor starts a fresh one without meaning to.'],
        ['the scaffolding', 'the poles and planks climb with the build, and the wooden bar keeps the tally: blocks laid, and how many different hands laid them.'],
        ['the plaque', 'lay the last block and the scaffolding comes down, the site glitters briefly, and every builder goes on a brass plaque in the order they first turned up — repeat offenders get a ×n.'],
        ['who can do what', 'a <b>user</b> lays one block a shift. a <b>moderator</b> can prise out a wonky block — the last one laid. the <b>owner</b> calls shifts, can have the hill lend a hand, and can tear the whole thing down.']
      ],
      tip: 'short of hands near the top? the owner\'s <b>the hill lends a hand</b> sends three to seven gnomes up the scaffolding while you watch.'
    },
    vending: {
      title: 'the dispensary',
      lead: 'a vending machine that does not take money — it takes <em>time</em>. it restocks itself one capsule every so often, a few bank up while you are away, and the little red display counts down whether or not anybody is watching. turn the knob, twist the capsule open, keep the trinket.',
      steps: [
        ['the machine', 'a visitor gets it as a <b>device</b>: the machine itself, with a glass case bolted to its side holding whatever they have won, and the odds stuck on the front. on the bench it opens out into its panels instead. the display is the countdown to the next capsule; the green lamps under it are how many are banked. turn the knob — the button, or the knob itself — and one rattles into the tray.'],
        ['the tray', 'a capsule sits in the tray until you twist it open, and it is still there tomorrow if you leave it. click the capsule, or press <b>twist it open</b>.'],
        ['what came out', 'twist the capsule and a note pops off the tray with the trinket in it, its tier and a line about it. if you already had one it says so, and how many of them you are now sitting on.'],
        ['the odds', 'printed on the side of the machine, in full, where anyone can read them — common 58, uncommon 27, rare 12, one of a kind 3. every tenth capsule is a rare or better, so nobody goes home with ten pebbles.'],
        ['the case', 'sixteen trinkets, sixteen slots. the ones you have not found are dashed question marks; duplicates stack with a ×n. click one you own and it tells you what it is — and offers to <b>dress it up</b>, with the same animations and effects as everything else on the bench.'],
        ['the round', 'the owner sets how often it restocks (thirty seconds up to a day) and how many capsules bank up before it stops filling. a day is what it would be out in the world; the short ones are so you can watch it work.'],
        ['who can do what', 'a <b>user</b> turns the knob and fills the cabinet. a <b>moderator</b> can see what is loaded next and hang the <b>out-of-order</b> sign. the <b>owner</b> sets the round, restocks by hand, can <b>rig</b> the next capsule to any tier, and can empty a cabinet.']
      ],
      tip: 'the roll happens when the machine restocks, not when you press — which is why a moderator can look in the hopper and tell you what is coming. it is already decided.'
    },
    sound: {
      title: 'the sound desk',
      lead: 'the six tracks the coming-soon page pretends to play, actually playing. there is not an audio file anywhere in this project — every note is made up on the spot and seeded off the track name, so a track sounds like itself every time without a byte being shipped.',
      steps: [
        ['01 the desk', 'six knobs and four switches. <b>drag a knob up and down</b> to turn it, double-click one to put it back where it was, or tab to it and use the arrow keys. the needle on the right is reading what is actually coming out, not a decoration.'],
        ['the knobs', '<b>level</b> how loud. <b>bass</b> and <b>treble</b> lift or cut the ends. <b>tone</b> closes the lid on it. <b>reverb</b> how much room. <b>speed</b> how fast it runs — which changes the tempo and nothing else, unless you flip TAPE.'],
        ['the switches', '<b>tape</b> ties the pitch to the speed knob, the way tape does, so half speed goes down an octave. <b>crunch</b> drives it until the edges go. <b>wobble</b> is a slow tremolo, as if the power were unsure. <b>hall</b> puts the reverb in a much larger room.'],
        ['02 the playlist', 'the same six, with who made them and how long they run. click one to go there. the little bars beside a track mean that is the one playing.'],
        ['what a visitor gets', 'the small speaker in the zoom dock, bottom right, and the slider next to it. press the speaker to start the hill humming or to mute it. that is all — the sound of a place is not something everyone who visits should be able to redesign.'],
        ['nothing starts on its own', 'browsers will not make a sound until somebody presses something, and quite right too. the desk remembers where you left every knob, but never begins by itself.'],
        ['who can do what', 'a <b>moderator</b> and the <b>owner</b> get the desk. a <b>user</b> gets the volume. there is no third thing.']
      ],
      tip: 'turn SPEED down to about 0.6, flip TAPE and HALL, and put REVERB most of the way up. that is the sound of the hill at four in the morning, and it was an accident.'
    },
    bugfarm: {
      title: 'the bug farm',
      lead: 'a bug tracker where the bug is a <em>bug</em>. everything reported hatches and paces about the pen, and how big it is, is how many people have hit it. nobody reads a list to find out what matters — the one that matters is the enormous winged thing lumbering across the field.',
      steps: [
        ['02 the pen', 'a fenced field in front of the barn, with the whole lot loose in it. the fences really are in front of and behind them, which is why nothing ever wanders out.'],
        ['01 seen something?', 'the wanted poster on the gate. one line on what it did, a <b>coat</b> and <b>marks</b> so you can tell yours apart, <b>where</b> it happened, your name if you want it on there, and up to three screenshots as evidence. it hatches as an egg, wobbles, and then there is a speck where it was. drag the poster by its pin if it is in the way.'],
        ['tap one', 'a bubble tells you what went wrong, who found it, how big it has got and <b>what it mutates into next</b> — with the <b>me too</b> button in it. tap the evidence to blow it up.'],
        ['me too', 'one per bug per device — tap it again to take it back and watch it shrink. reporting one counts as your own.'],
        ['how it mutates', 'a speck → <b>a nymph</b> at 2 → <b>spiky</b> at 4 → <b>three-eyed</b> at 7 → <b>a winged terror</b> at 10. it grows the limbs in front of you; the tier and the size are the same fact.'],
        ['03 the swatted', 'the owner swats a bug when it is fixed. it rolls over, drops out of the field, and hangs inside the barn with the date on it — a changelog nobody had to write. tap the doors to look in.'],
        ['04 backlog', 'the silo. how many are still out there, and a gauge that fills as the field does.'],
        ['who can do what', 'a <b>user</b> reports and says me-too. a <b>moderator</b> gets the ledger and can mark one <b>can’t reproduce</b> — it rolls on its back and stops growing until somebody believes it. the <b>owner</b> swats them, shakes the pen, and can empty it.']
      ],
      tip: 'the fastest way to find your worst bug is to look at the field from across the room. that is the entire idea.'
    },
    capsule: {
      title: 'the time capsule',
      lead: 'a chest, buried in the hill, with a date on the sign. anyone can put <em>one</em> thing in before it seals — a note or a drawing — and nobody sees inside until the day it spills.',
      steps: [
        ['01 dig site', 'a cross-section of the hill: sky, grass, soil, chest. the sign keeps the countdown; the worm keeps its own counsel. click the chest to knock, if it helps.'],
        ['02 deposit', 'pick <b>a note</b> or <b>a drawing</b>, sign it — or don\'t, "anonymous" is a respectable signature — and press <b>lower it in</b>. one keepsake per device, and <b>no take-backs</b>. that is what buried means.'],
        ['the waiting', 'the count under the form says how many somethings are inside, never which. i have checked. it holds firm.'],
        ['03 the spill', 'on the day — or when the owner cracks it early — the lid comes up and everything lands below on paper scraps and in little frames, each one signed and dated. only then.'],
        ['who can do what', 'a <b>user</b> lowers one keepsake in and waits like everybody else. a <b>moderator</b> can <b>give it a shake</b> and hear roughly how full it is — roughly. the <b>owner</b> sets the day, can <b>seal it</b> early, <b>crack it open</b> early, and — once it has spilled — <b>bury a fresh one</b>.']
      ],
      tip: 'the chest on the shared hill is this chest. hover it there and it gives you the date and nothing else. no, i cannot get it open sooner. i have asked.'
    },
    zoetrope: {
      title: 'the zoetrope',
      lead: 'a zoetrope is the old drum that spins a strip of stills until they move. this one takes <em>your own</em> picture — off your machine, not off the internet — and pins it to the paper, where it stays. a gif turns; a still just sits there looking pleased with itself.',
      steps: [
        ['01 the drum', 'three ways in, all the same road: press <b>choose a picture</b>, <b>drop a file</b> on the drum, or just <b>paste</b> one. png, jpeg, gif, webp, avif and svg.'],
        ['where it lands', 'in the middle of whatever you are looking at — unless you dropped it on the <b>bare paper</b>, in which case it lands exactly where you let go.'],
        ['02 on the paper', 'everything up, newest first, with what it weighs. <b>find</b> flies the camera to one and makes it flash. <b>take down</b> unpins it. you can take down your own; a moderator can take down anybody\'s.'],
        ['moving them about', 'drag a pinned picture anywhere on the sheet — it pans and zooms with the paper like everything else, and it remembers where you left it. click one and the usual card turns up, so it can bob, wobble, glow like a lantern or go grey as stone, same as a critter or a drawing.'],
        ['what happens to it', 'nothing is uploaded — there is nowhere to upload it to. a big photo is <b>shrunk here</b> before it is kept, which is why a 4MB one lands at about 60KB. a gif is kept <b>whole</b>, because putting one through a shrinker keeps the first frame and loses the rest, so an oversized gif is refused rather than quietly ruined.'],
        ['03 the works', 'the <b>owner</b> sets how big pictures land, can shut the drum to visitors, sees how much is being kept on the device, and can clear the paper.'],
        ['who can do what', 'a <b>user</b> puts pictures up, drags them and takes down their own. a <b>moderator</b> takes down anybody\'s. the <b>owner</b> holds the size, the switch and the broom.']
      ],
      tip: 'the browser gives this whole bench a few megabytes, so the drum asks for the room BEFORE it promises a picture. if there is none left it says so instead of pinning something that would be gone by morning.'
    },
    crt: {
      title: 'the chatter-tron 2000',
      lead: 'a big putty monitor with a board running on it that <em>everybody looking at this page</em> can type into, and a bank of notes taped down the side of the case that only staff may write on.',
      steps: [
        ['it is not pretending', 'there is no server behind this bench, so a chat board is the one gizmo that would have to fake it. this one does not. open the lab in a <b>second window</b> and that window is a second person — the two really do talk. what it will not do is reach another machine; that needs a server, and saying so is more use than a fake one.'],
        ['saying something', 'type on the slab and press <b>SEND</b>. your lines come back on the right in cream; everybody else is on the left in yellow. hover one of your own to take it back.'],
        ['your handle', 'belongs to this <b>window</b>, not this device — a second window is somebody else, and a reload is still you. <b>who’s on</b> lists every window that has said hello in the last fifteen seconds.'],
        ['the notes on the case', 'staff write them. the owner adds and takes them off; the little round button cycles the pad colour. five at most, and the case is full.'],
        ['03 the works', 'the owner can <b>lock the board</b> — only staff may type, everybody can still read — and can wipe it. the last 120 lines are kept, on this device, and the oldest scroll off the top.']
      ],
      tip: 'nothing said here leaves the browser. that is not a privacy promise, it is a limitation, and from where you are standing it is the same thing.'
    },
    press: {
      title: 'the knoll times press',
      lead: 'the bench’s own history, printed the old way. nothing here is written by hand — the press <em>reads every other gizmo</em> and sets the news itself.',
      steps: [
        ['how an issue happens', 'nobody presses anything. everything that has ever happened on the bench is stamped with a date, the events are sorted into the days they fell on, and <b>every day that had news is one issue</b>. the newest sits on the press; the rest go on the newsstand.'],
        ['what counts as news', 'a petition carried, a thing shipped out of the shed, a mayor elected, a drawing varnished, a landmark named, a bug swatted. the loudest of them that day takes the headline, the next two get columns, and the rest go in the <b>patch notes</b> at the bottom.'],
        ['reading one', 'click any paper. it lands folded and drops open. escape, the ✕, or a click outside folds it away again.'],
        ['the newsstand', 'every dispatch ever printed, newest first, free. no. 001 is the founding issue and is always there, so the numbering has somewhere to start.'],
        ['the wax', 'the owner sets the letter in the seal. it is on every paper on the stand, so changing it re-stamps the lot.']
      ],
      tip: 'pass a petition on the ballot-o-tron and then look at the press. the front page has already changed, and nobody typed anything.'
    },
  };

  // a gnome who has clearly been asked something he can't answer: head on one
  // side, one eyebrow up, scratching under the hat
  const GNOME = '<svg class="gnome-art" viewBox="0 0 66 78" width="58" height="68" aria-hidden="true">'
    + '<g class="gnome-marks"><text x="50" y="22" class="gnome-q1">?</text><text x="58" y="11" class="gnome-q2">?</text></g>'
    + '<g class="gnome-body">'
    + '<ellipse cx="25" cy="69" rx="6.5" ry="3.6" class="gn-boot"/><ellipse cx="39" cy="69" rx="6.5" ry="3.6" class="gn-boot"/>'
    + '<path d="M23 47h18l5 21q-14 4-28 0z" class="gn-coat"/>'
    + '<rect x="21" y="55" width="24" height="4.5" rx="2" class="gn-belt"/>'
    + '<g class="gnome-head">'
    + '<circle cx="32" cy="41" r="10.5" class="gn-skin"/>'
    + '<path d="M23.5 43.5q-1 16 8.5 18 9.5-2 8.5-18z" class="gn-beard"/>'
    + '<circle cx="27.4" cy="40.2" r="1.7" class="gn-eye"/><circle cx="35.6" cy="40.2" r="1.7" class="gn-eye"/>'
    + '<path d="M24.6 37.6l5-2.5M34.6 36.6l5 1.4" class="gn-brow"/>'   // one up, one down: baffled
    + '<circle cx="32" cy="45.5" r="4" class="gn-nose"/>'
    + '<ellipse cx="32" cy="31.5" rx="15" ry="3.6" class="gn-brim"/>'
    + '<path d="M17.5 31Q19 11 41 5q6 14 6.5 26z" class="gn-hat"/>'
    + '</g>'
    + '<path d="M41 53l7-9-3-9" class="gn-arm"/><circle cx="44.5" cy="34" r="3.6" class="gn-skin"/>'
    + '</g></svg>';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let open = null;

  function bubble(help) {
    const rows = help.steps.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + v + '</dd></div>').join('');
    // data-nodrag: on a gizmo with no handle bar the whole machine takes the
    // drag, and a bubble you are trying to read is not a thing to pick it up by
    return '<div class="gnome-say" data-nodrag hidden>'
      + '<div class="gnome-say-top"><b>HOW THIS WORKS</b>'
      + '<button type="button" class="gnome-x" aria-label="never mind">×</button></div>'
      + '<h4>' + esc(help.title) + '</h4>'
      + '<p class="gnome-lead">' + help.lead + '</p>'
      + '<dl class="gnome-steps">' + rows + '</dl>'
      + '<p class="gnome-tip">' + help.tip + '</p>'
      + '</div>';
  }

  function shut() {
    if (!open) return;
    open.say.hidden = true;
    open.btn.setAttribute('aria-expanded', 'false');
    open.wrap.classList.remove('open');
    open = null;
  }

  function mount(gz) {
    const help = HELP[gz.dataset.gizmo];
    if (!help) return;

    const wrap = document.createElement('div');
    wrap.className = 'gnome-help';
    wrap.innerHTML = '<button type="button" class="gnome-btn" aria-expanded="false" aria-label="how the '
      + esc(help.title) + ' works">' + GNOME + '</button>' + bubble(help);
    gz.appendChild(wrap);

    const btn = wrap.querySelector('.gnome-btn'), say = wrap.querySelector('.gnome-say');
    const me = { wrap, btn, say };

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = open && open.wrap === wrap;
      shut();
      if (wasOpen) return;
      say.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      wrap.classList.add('open');                // lab.js has already raised the gizmo
      open = me;
    });
    say.addEventListener('click', e => e.stopPropagation());
    wrap.querySelector('.gnome-x').addEventListener('click', shut);
  }

  document.querySelectorAll('#bench [data-gizmo]').forEach(mount);
  document.addEventListener('click', shut);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });

  return { shut, HELP };
})();
