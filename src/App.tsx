// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';

const SUBJECTS = [
  {
    id: 'maths',
    name: 'Mathematics',
    icon: '📐',
    color: '#2563eb',
    chapters: [
      'Real Numbers',
      'Polynomials',
      'Pair of Linear Equations in Two Variables',
      'Quadratic Equations',
      'Arithmetic Progressions',
      'Triangles',
      'Coordinate Geometry',
      'Introduction to Trigonometry',
      'Some Applications of Trigonometry',
      'Circles',
      'Areas Related to Circles',
      'Surface Areas and Volumes',
      'Statistics',
      'Probability',
    ],
  },
  {
    id: 'science',
    name: 'Science',
    icon: '🔬',
    color: '#059669',
    chapters: [
      'Chemical Reactions and Equations',
      'Acids, Bases and Salts',
      'Metals and Non-metals',
      'Carbon and its Compounds',
      'Life Processes',
      'Control and Coordination',
      'How do Organisms Reproduce?',
      'Heredity',
      'Light – Reflection and Refraction',
      'Human Eye and Colourful World',
      'Electricity',
      'Magnetic Effects of Electric Current',
      'Our Environment',
    ],
  },
  {
    id: 'english',
    name: 'English',
    icon: '📖',
    color: '#d97706',
    sections: [
      {
        name: 'First Flight – Prose',
        chapters: [
          'A Letter to God',
          'Nelson Mandela: Long Walk to Freedom',
          'Two Stories about Flying',
          'From the Diary of Anne Frank',
          'Glimpses of India',
          'Mijbil the Otter',
          'Madam Rides the Bus',
          'The Sermon at Benares',
          'The Proposal',
        ],
      },
      {
        name: 'First Flight – Poetry',
        chapters: [
          'Dust of Snow',
          'Fire and Ice',
          'A Tiger in the Zoo',
          'How to Tell Wild Animals',
          'The Ball Poem',
          'Amanda!',
          'Animals',
          'The Trees',
          'Fog',
          'The Tale of Custard the Dragon',
          'For Anne Gregory',
        ],
      },
      {
        name: 'Footprints Without Feet',
        chapters: [
          'A Triumph of Surgery',
          "The Thief's Story",
          'The Midnight Visitor',
          'A Question of Trust',
          'Footprints without Feet',
          'The Making of a Scientist',
          'The Necklace',
          'Bholi',
          'The Book That Saved the Earth',
        ],
      },
    ],
  },
  {
    id: 'hindi',
    name: 'Hindi',
    icon: '🪔',
    color: '#dc2626',
    sections: [
      {
        name: 'Kshitij – Kavya Khand (Poetry)',
        chapters: [
          'Kabir – Sakhiyan aur Sabad',
          'Mirabai – Pad',
          'Bihari – Dohe',
          'Maithili Sharan Gupt – Manushyata',
          'Sumitranandan Pant – Parvat Pradesh mein Pavas',
          'Mahadevi Verma – Madhur Madhur Mere Deepak Jal',
          'Nagarjuna – Yah Danturit Muskan / Fasal',
          'Mangalesh Dabral – Sangatkar',
        ],
      },
      {
        name: 'Kshitij – Gadya Khand (Prose)',
        chapters: [
          'Swayam Prakash – Netaji ka Chashma',
          'Ram Vriksh Benipuri – Balgobin Bhagat',
          'Yashpal – Lakhnavi Andaaz',
          'Mannu Bhandari – Ek Kahani Yeh Bhi',
          'Sarveshwar Dayal Saxena – Manoj',
          'Hazari Prasad Dwivedi – Sanskriti',
          'Habib Tanvir – Kartoos',
        ],
      },
      {
        name: 'Kritika',
        chapters: [
          'Mata ka Anchal – Shivpujan Sahay',
          'George Pancham ki Naak – Kamleshwar',
          'Sana-Sana Haath Jodi – Madhu Kankariya',
          "Ehi Thaiya Jhulni Herani Ho Rama – Shivprasad Mishra 'Rudra'",
          'Main Kyun Likhta Hoon – Nirmal Verma',
        ],
      },
    ],
  },
  {
    id: 'sst',
    name: 'Social Studies',
    icon: '🌍',
    color: '#7c3aed',
    sections: [
      {
        name: 'History – India & the Contemporary World II',
        chapters: [
          'The Rise of Nationalism in Europe',
          'Nationalism in India',
          'The Making of a Global World',
          'The Age of Industrialisation',
          'Print Culture and the Modern World',
        ],
      },
      {
        name: 'Geography – Contemporary India II',
        chapters: [
          'Resources and Development',
          'Forest and Wildlife Resources',
          'Water Resources',
          'Agriculture',
          'Minerals and Energy Resources',
          'Manufacturing Industries',
          'Lifelines of National Economy',
        ],
      },
      {
        name: 'Political Science – Democratic Politics II',
        chapters: [
          'Power Sharing',
          'Federalism',
          'Gender, Religion and Caste',
          'Political Parties',
          'Outcomes of Democracy',
        ],
      },
      {
        name: 'Economics – Understanding Economic Development',
        chapters: [
          'Development',
          'Sectors of the Indian Economy',
          'Money and Credit',
          'Globalisation and the Indian Economy',
          'Consumer Rights',
        ],
      },
    ],
  },
];

function flattenChapters(sub) {
  if (sub.chapters)
    return sub.chapters.map((c, i) => ({
      id: `${sub.id}__${i}`,
      name: c,
      section: null,
    }));
  const out = [];
  sub.sections.forEach((sec) =>
    sec.chapters.forEach((c, i) =>
      out.push({
        id: `${sub.id}__${sec.name}__${i}`,
        name: c,
        section: sec.name,
      })
    )
  );
  return out;
}

const S_CYCLE = ['not_started', 'in_progress', 'completed', 'revised'];
const S_CFG = {
  not_started: {
    label: 'Not Started',
    color: '#6b7280',
    bg: '#f9fafb',
    border: '#e5e7eb',
    dot: '⬜',
  },
  in_progress: {
    label: 'In Progress',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fcd34d',
    dot: '🔄',
  },
  completed: {
    label: 'Completed',
    color: '#059669',
    bg: '#f0fdf4',
    border: '#86efac',
    dot: '✅',
  },
  revised: {
    label: 'Revised ⭐',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#c4b5fd',
    dot: '🌟',
  },
};
const TEST_TYPES = [
  'Class Test',
  'Unit Test',
  'Half Yearly Exam',
  'Annual Exam',
  'Practice Test',
  'Mock Test',
  'Oral Test',
  'Assignment',
  'Other',
];

function pct(o, m) {
  return m > 0 ? Math.round((o / m) * 100) : 0;
}
function pctColor(p) {
  return p >= 80 ? '#059669' : p >= 60 ? '#d97706' : '#dc2626';
}

export default function App() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [testModal, setTestModal] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [tf, setTf] = useState({
    type: 'Class Test',
    date: new Date().toISOString().slice(0, 10),
    obtained: '',
    max: '',
    notes: '',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('savio_v3');
      if (saved) setData(JSON.parse(saved));
    } catch {}
    setLoading(false);
  }, []);

  const persist = useCallback((nd) => {
    setData(nd);
    try {
      localStorage.setItem('savio_v3', JSON.stringify(nd));
    } catch {}
  }, []);

  const cd = (id) =>
    data[id] || {
      status: 'not_started',
      revision: false,
      tests: [],
      notes: '',
    };

  const cycleStatus = (id) => {
    const c = cd(id);
    const i = S_CYCLE.indexOf(c.status);
    persist({ ...data, [id]: { ...c, status: S_CYCLE[(i + 1) % 4] } });
  };
  const toggleRev = (id) => {
    const c = cd(id);
    persist({ ...data, [id]: { ...c, revision: !c.revision } });
  };
  const addTest = (id) => {
    if (!tf.obtained || !tf.max) return;
    const c = cd(id);
    persist({
      ...data,
      [id]: { ...c, tests: [...(c.tests || []), { ...tf, id: Date.now() }] },
    });
    setTf({
      type: 'Class Test',
      date: new Date().toISOString().slice(0, 10),
      obtained: '',
      max: '',
      notes: '',
    });
  };
  const delTest = (cid, tid) => {
    const c = cd(cid);
    persist({
      ...data,
      [cid]: { ...c, tests: c.tests.filter((t) => t.id !== tid) },
    });
  };
  const saveNote = (id, note) => {
    const c = cd(id);
    persist({ ...data, [id]: { ...c, notes: note } });
  };

  const stats = useMemo(() => {
    const ss = SUBJECTS.map((sub) => {
      const chs = flattenChapters(sub);
      const done = chs.filter((c) =>
        ['completed', 'revised'].includes(cd(c.id).status)
      ).length;
      const prog = chs.filter((c) => cd(c.id).status === 'in_progress').length;
      const rev = chs.filter((c) => cd(c.id).revision).length;
      const allTests = chs.flatMap((c) =>
        (cd(c.id).tests || []).map((t) => ({ ...t, cName: c.name }))
      );
      return {
        id: sub.id,
        name: sub.name,
        icon: sub.icon,
        color: sub.color,
        total: chs.length,
        done,
        prog,
        rev,
        tests: allTests,
      };
    });
    const tot = ss.reduce((a, s) => a + s.total, 0),
      don = ss.reduce((a, s) => a + s.done, 0);
    return { ss, tot, don, pct: tot ? Math.round((don / tot) * 100) : 0 };
  }, [data]);

  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontFamily: 'system-ui',
          fontSize: 18,
          color: '#374151',
        }}
      >
        📚 Loading Savio's Study Tracker…
      </div>
    );

  const inp = (st) => ({
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    boxSizing: 'border-box',
    ...st,
  });

  return (
    <div
      style={{
        fontFamily: "'Segoe UI',system-ui,sans-serif",
        maxWidth: 860,
        margin: '0 auto',
        padding: 14,
        minHeight: '100vh',
        background: '#f1f5f9',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: 'linear-gradient(135deg,#1e3a8a,#6d28d9)',
          borderRadius: 16,
          padding: '18px 22px',
          marginBottom: 14,
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 32 }}>📚</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>
              Savio's Study Tracker
            </div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              Class 10 • CBSE NCERT
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.pct}%</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {stats.don}/{stats.tot} done
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            background: 'rgba(255,255,255,.25)',
            borderRadius: 20,
            height: 8,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 20,
              height: 8,
              width: `${stats.pct}%`,
              transition: 'width .6s ease',
            }}
          />
        </div>
      </div>

      {/* TABS */}
      <div
        style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}
      >
        {['dashboard', ...SUBJECTS.map((s) => s.id)].map((t) => {
          const sub = SUBJECTS.find((s) => s.id === t);
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '7px 13px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                background: active ? (sub ? sub.color : '#1e3a8a') : 'white',
                color: active ? 'white' : '#374151',
                boxShadow: active
                  ? '0 2px 10px rgba(0,0,0,.22)'
                  : '0 1px 3px rgba(0,0,0,.08)',
                transition: 'all .18s',
              }}
            >
              {t === 'dashboard' ? '🏠 Dashboard' : `${sub.icon} ${sub.name}`}
            </button>
          );
        })}
      </div>

      {/* DASHBOARD */}
      {tab === 'dashboard' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))',
              gap: 10,
              marginBottom: 14,
            }}
          >
            {stats.ss.map((s) => (
              <div
                key={s.id}
                onClick={() => setTab(s.id)}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderTop: `4px solid ${s.color}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,.07)',
                  transition: 'transform .15s,box-shadow .15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow =
                    '0 4px 14px rgba(0,0,0,.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.07)';
                }}
              >
                <div style={{ fontSize: 26 }}>{s.icon}</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    marginTop: 5,
                    color: '#111827',
                  }}
                >
                  {s.name}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>
                  {Math.round((s.done / s.total) * 100)}%
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {s.done}/{s.total} chapters
                </div>
                {s.prog > 0 && (
                  <div style={{ fontSize: 11, color: '#d97706', marginTop: 2 }}>
                    🔄 {s.prog} in progress
                  </div>
                )}
                {s.rev > 0 && (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 1 }}>
                    🚩 {s.rev} flagged
                  </div>
                )}
                <div
                  style={{
                    marginTop: 8,
                    background: '#f3f4f6',
                    borderRadius: 10,
                    height: 5,
                  }}
                >
                  <div
                    style={{
                      background: s.color,
                      borderRadius: 10,
                      height: 5,
                      width: `${Math.round((s.done / s.total) * 100)}%`,
                      transition: 'width .5s',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,.07)',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 8,
                color: '#374151',
              }}
            >
              How to use
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(S_CFG).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    background: v.bg,
                    border: `1px solid ${v.border}`,
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 12,
                    color: v.color,
                    fontWeight: 600,
                  }}
                >
                  {v.dot} {v.label}
                </div>
              ))}
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 12,
                  color: '#dc2626',
                  fontWeight: 600,
                }}
              >
                🚩 Flagged for Revision
              </div>
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #93c5fd',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontSize: 12,
                  color: '#2563eb',
                  fontWeight: 600,
                }}
              >
                📝 Has Notes
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              Click the status badge on any chapter to cycle its progress. Use
              "+ Test" to record scores.
            </div>
          </div>

          {/* Recent scores */}
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: '14px 16px',
              boxShadow: '0 1px 4px rgba(0,0,0,.07)',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 12,
                color: '#111827',
              }}
            >
              📝 Recent Test Scores
            </div>
            {(() => {
              const all = SUBJECTS.flatMap((sub) =>
                flattenChapters(sub).flatMap((ch) =>
                  (cd(ch.id).tests || []).map((t) => ({
                    ...t,
                    cName: ch.name,
                    sIcon: sub.icon,
                    sColor: sub.color,
                    sName: sub.name,
                  }))
                )
              );
              all.sort((a, b) => new Date(b.date) - new Date(a.date));
              const recent = all.slice(0, 10);
              if (!recent.length)
                return (
                  <div
                    style={{
                      color: '#9ca3af',
                      fontSize: 14,
                      textAlign: 'center',
                      padding: '18px 0',
                    }}
                  >
                    No test scores yet — go to a subject and tap "+ Test" on any
                    chapter!
                  </div>
                );
              return recent.map((t, i) => {
                const p = pct(t.obtained, t.max);
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{t.sIcon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.cName}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {t.type} • {t.date}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 16,
                          color: pctColor(p),
                        }}
                      >
                        {t.obtained}/{t.max}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{p}%</div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}

      {/* SUBJECT VIEW */}
      {SUBJECTS.map((sub) => {
        if (tab !== sub.id) return null;
        const allCh = flattenChapters(sub);
        const done = allCh.filter((c) =>
          ['completed', 'revised'].includes(cd(c.id).status)
        ).length;
        let sections;
        if (sub.chapters) sections = [{ name: null, chs: allCh }];
        else {
          let i = 0;
          sections = sub.sections.map((sec) => {
            const chs = allCh.slice(i, i + sec.chapters.length);
            i += sec.chapters.length;
            return { name: sec.name, chs };
          });
        }
        return (
          <div key={sub.id}>
            <div
              style={{
                background: sub.color,
                borderRadius: 12,
                padding: '13px 18px',
                marginBottom: 14,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 30 }}>{sub.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{sub.name}</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  {done}/{allCh.length} chapters complete •{' '}
                  {Math.round((done / allCh.length) * 100)}%
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(255,255,255,.2)',
                  borderRadius: 10,
                  padding: '6px 12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  {Math.round((done / allCh.length) * 100)}%
                </div>
              </div>
            </div>
            {sections.map((sec) => (
              <div key={sec.name || 'm'} style={{ marginBottom: 20 }}>
                {sec.name && (
                  <div
                    style={{
                      fontWeight: 700,
                      color: sub.color,
                      fontSize: 13,
                      marginBottom: 8,
                      paddingBottom: 6,
                      borderBottom: `2px solid ${sub.color}33`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>📌</span>
                    {sec.name}
                  </div>
                )}
                {sec.chs.map((ch) => {
                  const cdata = cd(ch.id),
                    sc = S_CFG[cdata.status],
                    tests = cdata.tests || [];
                  const avg = tests.length
                    ? Math.round(
                        tests.reduce((a, t) => a + pct(t.obtained, t.max), 0) /
                          tests.length
                      )
                    : null;
                  return (
                    <div
                      key={ch.id}
                      style={{
                        background: sc.bg,
                        border: `1px solid ${sc.border}`,
                        borderRadius: 10,
                        padding: '10px 13px',
                        marginBottom: 7,
                        transition: 'all .2s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          onClick={() => cycleStatus(ch.id)}
                          title="Click to change status"
                          style={{
                            background: sc.color,
                            color: 'white',
                            border: 'none',
                            borderRadius: 20,
                            padding: '3px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {sc.dot} {sc.label}
                        </button>
                        <div
                          style={{
                            flex: 1,
                            fontWeight: 600,
                            fontSize: 14,
                            color: '#1e293b',
                            minWidth: 80,
                          }}
                        >
                          {ch.name}
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          <button
                            onClick={() => toggleRev(ch.id)}
                            title={
                              cdata.revision
                                ? 'Remove flag'
                                : 'Flag for revision'
                            }
                            style={{
                              background: cdata.revision ? '#fef2f2' : 'white',
                              border: `1px solid ${
                                cdata.revision ? '#fca5a5' : '#e5e7eb'
                              }`,
                              borderRadius: 7,
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            {cdata.revision ? '🚩' : '🏳️'}
                          </button>
                          <button
                            onClick={() =>
                              setNoteModal({
                                id: ch.id,
                                name: ch.name,
                                note: cdata.notes || '',
                              })
                            }
                            style={{
                              background: cdata.notes ? '#eff6ff' : 'white',
                              border: `1px solid ${
                                cdata.notes ? '#93c5fd' : '#e5e7eb'
                              }`,
                              borderRadius: 7,
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            {cdata.notes ? '📝' : '📄'}
                          </button>
                          <button
                            onClick={() => {
                              setTestModal({ id: ch.id, name: ch.name });
                              setTf({
                                type: 'Class Test',
                                date: new Date().toISOString().slice(0, 10),
                                obtained: '',
                                max: '',
                                notes: '',
                              });
                            }}
                            style={{
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: 7,
                              padding: '4px 10px',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#374151',
                            }}
                          >
                            + Test
                          </button>
                        </div>
                      </div>
                      {tests.length > 0 && (
                        <div
                          style={{
                            marginTop: 8,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 5,
                            alignItems: 'center',
                          }}
                        >
                          {tests.map((t) => {
                            const p = pct(t.obtained, t.max);
                            return (
                              <div
                                key={t.id}
                                style={{
                                  background: 'white',
                                  borderRadius: 7,
                                  padding: '3px 9px',
                                  fontSize: 12,
                                  border: '1px solid #e5e7eb',
                                  display: 'flex',
                                  gap: 5,
                                  alignItems: 'center',
                                }}
                              >
                                <span style={{ color: '#6b7280' }}>
                                  {t.type}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: pctColor(p),
                                  }}
                                >
                                  {t.obtained}/{t.max} ({p}%)
                                </span>
                                <button
                                  onClick={() => delTest(ch.id, t.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#d1d5db',
                                    fontSize: 11,
                                    padding: '0 0 0 2px',
                                    lineHeight: 1,
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                          {avg !== null && (
                            <span style={{ fontSize: 12, color: '#6b7280' }}>
                              Avg:{' '}
                              <strong style={{ color: pctColor(avg) }}>
                                {avg}%
                              </strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}

      {/* TEST MODAL */}
      {testModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 22,
              width: '100%',
              maxWidth: 400,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,.3)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 17, color: '#111827' }}>
              📝 Add Test Score
            </div>
            <div
              style={{
                color: '#6b7280',
                fontSize: 13,
                marginBottom: 14,
                marginTop: 2,
              }}
            >
              {testModal.name}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
                color: '#374151',
              }}
            >
              Test Type
            </div>
            <select
              value={tf.type}
              onChange={(e) => setTf({ ...tf, type: e.target.value })}
              style={inp({ marginBottom: 11 })}
            >
              {TEST_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
                color: '#374151',
              }}
            >
              Date
            </div>
            <input
              type="date"
              value={tf.date}
              onChange={(e) => setTf({ ...tf, date: e.target.value })}
              style={inp({ marginBottom: 11 })}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 11,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 4,
                    color: '#374151',
                  }}
                >
                  Marks Obtained
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 18"
                  value={tf.obtained}
                  onChange={(e) => setTf({ ...tf, obtained: e.target.value })}
                  style={inp()}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 4,
                    color: '#374151',
                  }}
                >
                  Max Marks
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 20"
                  value={tf.max}
                  onChange={(e) => setTf({ ...tf, max: e.target.value })}
                  style={inp()}
                />
              </div>
            </div>
            {tf.obtained && tf.max && +tf.max > 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '8px 0',
                  fontSize: 26,
                  fontWeight: 800,
                  color: pctColor(pct(+tf.obtained, +tf.max)),
                  marginBottom: 8,
                }}
              >
                {pct(+tf.obtained, +tf.max)}%{' '}
                {pct(+tf.obtained, +tf.max) >= 80
                  ? '🎉'
                  : pct(+tf.obtained, +tf.max) >= 60
                  ? '👍'
                  : '📖'}
              </div>
            )}
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
                color: '#374151',
              }}
            >
              Notes (optional)
            </div>
            <textarea
              placeholder="Any remarks…"
              value={tf.notes}
              onChange={(e) => setTf({ ...tf, notes: e.target.value })}
              style={inp({
                minHeight: 60,
                resize: 'vertical',
                marginBottom: 14,
              })}
            />
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button
                onClick={() => setTestModal(null)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addTest(testModal.id);
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: 'none',
                  background: '#1e3a8a',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Save Score
              </button>
            </div>
            {(cd(testModal.id).tests || []).length > 0 && (
              <>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#374151',
                    marginBottom: 6,
                  }}
                >
                  Previous Scores
                </div>
                {(cd(testModal.id).tests || []).map((t) => {
                  const p = pct(t.obtained, t.max);
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 10px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        marginBottom: 5,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#1e293b',
                          }}
                        >
                          {t.type} • {t.date}
                        </div>
                        {t.notes && (
                          <div style={{ fontSize: 11, color: '#6b7280' }}>
                            {t.notes}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          color: pctColor(p),
                          fontSize: 15,
                        }}
                      >
                        {t.obtained}/{t.max}
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: pctColor(p),
                          fontSize: 12,
                        }}
                      >
                        {p}%
                      </div>
                      <button
                        onClick={() => delTest(testModal.id, t.id)}
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          borderRadius: 6,
                          padding: '3px 8px',
                          cursor: 'pointer',
                          color: '#dc2626',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* NOTE MODAL */}
      {noteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 16,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 22,
              width: '100%',
              maxWidth: 380,
              boxShadow: '0 20px 60px rgba(0,0,0,.3)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 17, color: '#111827' }}>
              📄 Chapter Notes
            </div>
            <div
              style={{
                color: '#6b7280',
                fontSize: 13,
                marginBottom: 12,
                marginTop: 2,
              }}
            >
              {noteModal.name}
            </div>
            <textarea
              value={noteModal.note}
              onChange={(e) =>
                setNoteModal({ ...noteModal, note: e.target.value })
              }
              placeholder="Study notes, important formulae, reminders, weak areas…"
              style={inp({
                minHeight: 110,
                resize: 'vertical',
                marginBottom: 14,
              })}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setNoteModal(null)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid #d1d5db',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveNote(noteModal.id, noteModal.note);
                  setNoteModal(null);
                }}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: 'none',
                  background: '#1e3a8a',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
