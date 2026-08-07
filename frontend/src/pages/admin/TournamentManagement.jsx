import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import api from '../../utils/api';
import { Trophy, Calendar, Plus, Users, DollarSign, Trash2, Edit, X } from 'lucide-react';
import { format } from 'date-fns';

const TournamentManagement = () => {
  const [tournaments, setTournaments] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    fees: '',
    prizeMoney: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data } = await api.get('/tournaments');
      setTournaments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/tournaments', formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', date: format(new Date(), "yyyy-MM-dd'T'HH:mm"), fees: '', prizeMoney: '' });
      fetchTournaments();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create tournament. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this tournament?')) {
      try {
        await api.delete(`/tournaments/${id}`);
        fetchTournaments();
      } catch (err) {
        console.error(err);
        alert('Failed to delete tournament');
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-on-background">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col">
        <Header title="Admin / Plan Tournaments" />
        
        <main className="p-xl">
          <div className="flex justify-between items-center mb-xl">
            <div>
              <h2 className="font-h1 text-4xl text-on-surface italic uppercase tracking-tighter">Tournament Manager</h2>
              <p className="text-on-surface-variant font-body-md">Schedule and manage competitive events for the lounge.</p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-4 bg-primary text-on-surface font-h1 text-lg italic uppercase tracking-wider rounded-2xl neon-shadow-purple hover:brightness-110 transition-all flex items-center gap-3"
            >
              <Plus className="w-6 h-6" /> Create Tournament
            </button>
          </div>

          <div className="grid grid-cols-1 gap-lg">
            {tournaments.map(t => (
              <div key={t.id} className="glass-card p-xl rounded-[40px] border border-outline-variant/20 flex justify-between items-center group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-xl">
                  <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Trophy className="w-10 h-10" />
                  </div>
                  <div>
                    <div className="flex gap-2 mb-2">
                      <span className="px-3 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] font-bold rounded-full uppercase tracking-widest">{t.status}</span>
                      <span className="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-bold rounded-full border border-secondary/20 uppercase tracking-widest">
                        {format(new Date(t.date), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <h3 className="text-2xl font-h1 text-on-surface uppercase leading-none mb-2">{t.name}</h3>
                    <div className="flex gap-6 text-on-surface-variant font-body-sm">
                      <button 
                        onClick={() => {
                          setSelectedTournament(t);
                          setShowPlayersModal(true);
                        }}
                        className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                      >
                        <Users className="w-4 h-4" /> {t.participants.length} Joined
                      </button>
                      <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Fee: INR {t.fees}</div>
                      <div className="flex items-center gap-2 text-secondary"><Trophy className="w-4 h-4" /> Prize: INR {t.prizeMoney}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                   <button 
                      onClick={() => {
                        setSelectedTournament(t);
                        setShowPlayersModal(true);
                      }}
                      className="px-6 py-4 rounded-2xl bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 font-h1 text-sm italic uppercase tracking-wider"
                   >
                      View Players
                   </button>
                   <button 
                      onClick={() => handleDelete(t.id)}
                      className="p-4 rounded-2xl bg-surface-container-low text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors border border-outline-variant/10"
                   >
                      <Trash2 className="w-6 h-6" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Players Modal */}
        {showPlayersModal && selectedTournament && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass-card w-[600px] max-h-[80vh] flex flex-col rounded-[40px] border border-outline-variant relative neon-shadow-purple overflow-hidden">
               <div className="p-xl border-b border-outline-variant/10 flex justify-between items-center">
                  <div>
                    <h2 className="font-h1 text-2xl text-on-surface italic uppercase tracking-wider mb-1">{selectedTournament.name}</h2>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Registered Participants ({selectedTournament.participants.length})</p>
                  </div>
                  <button onClick={() => setShowPlayersModal(false)} className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
                    <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-xl custom-scrollbar">
                  {selectedTournament.participants.length > 0 ? (
                    <div className="space-y-4">
                      {selectedTournament.participants.map((player, idx) => (
                        <div key={player.id} className="p-lg rounded-3xl bg-surface-container-low border border-outline-variant/10 flex items-center gap-lg group hover:border-primary/30 transition-all">
                           <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-h1 text-xl italic border border-primary/20">
                              {player.avatar ? <img src={player.avatar} className="w-full h-full object-cover rounded-2xl" alt="" /> : player.name[0]}
                           </div>
                           <div className="flex-1">
                              <p className="text-on-surface font-h2 text-xl leading-none mb-1">{player.name}</p>
                              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{player.email}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-secondary font-body font-bold text-lg italic">{player.rating || 1000}</p>
                              <p className="text-[8px] text-on-surface-variant font-bold uppercase tracking-[0.2em]">Skill Rating</p>
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-on-surface-variant/40">
                       <Users className="w-12 h-12 mb-2" />
                       <p className="font-h1 text-xl italic uppercase">No players registered yet</p>
                    </div>
                  )}
               </div>
               
               <div className="p-lg bg-surface-container-low/50 border-t border-outline-variant/10 text-center">
                  <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-widest">Tournament Roster is auto-populated upon registration</p>
               </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass-card w-[500px] p-xl rounded-[40px] border border-outline-variant relative neon-shadow-purple">
               <h2 className="font-h1 text-3xl text-on-surface mb-8 italic uppercase tracking-wider">New Tournament</h2>
               <form onSubmit={handleCreate} className="space-y-6">
                  <div>
                    <label className="block text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-2">Tournament Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface focus:border-primary/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface focus:border-primary/50 outline-none h-24"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-2">Entry Fee (INR)</label>
                      <input 
                        type="number" 
                        required
                        value={formData.fees}
                        onChange={e => setFormData({...formData, fees: e.target.value})}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface focus:border-primary/50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-2">Prize Money (INR)</label>
                      <input 
                        type="number" 
                        required
                        value={formData.prizeMoney}
                        onChange={e => setFormData({...formData, prizeMoney: e.target.value})}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface focus:border-primary/50 outline-none font-bold text-secondary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-2">Event Date</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 text-on-surface focus:border-primary/50 outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 text-on-surface-variant font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                    <button type="submit" disabled={loading} className="flex-[2] py-4 bg-primary text-on-surface font-h1 text-lg italic uppercase tracking-wider rounded-2xl neon-shadow-purple hover:brightness-110 transition-all">
                       {loading ? 'Creating...' : 'Launch Tournament'}
                    </button>
                  </div>
               </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentManagement;
