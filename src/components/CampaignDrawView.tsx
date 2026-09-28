// @ts-nocheck
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Video, StopCircle, Trophy, ArrowLeft, Ticket, Search, User, CheckCircle, ExternalLink, Camera, AlertCircle, Volume2, VolumeX, Printer, Send, RefreshCw, Sparkles, X, Info, Plus, Image as ImageIcon } from 'lucide-react';
import { RaffleCampaign, RaffleWin, CampaignWinner } from '../types';
import { generateSingleCouponReceiptContent, printHtml } from '../services/printerService';

interface Props {
  campaign: RaffleCampaign;
  onBack: () => void;
}

// Simple Web Audio API Sound Synthesizer
const playTickSound = (pitch = 500) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {
    // Silent catch if audio is blocked
  }
};

const playFanfareSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.09);
      osc.stop(ctx.currentTime + idx * 0.09 + 0.35);
    });
  } catch (e) {
    console.error(e);
  }
};

export const CampaignDrawView: React.FC<Props> = ({ campaign, onBack }) => {
  const { sales, customers, updateCustomer, settings, updateRaffleCampaign } = useStore();

  // Screen Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'screen' | 'webcam' | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<BlobPart[]>([]);
  const [recordingHelpModalOpen, setRecordingHelpModalOpen] = useState(false);
  const [recordingErrorMessage, setRecordingErrorMessage] = useState('');

  // Audio mute setting
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Draw State
  const [drawStage, setDrawStage] = useState<'idle' | 'countdown' | 'spinning' | 'revealing' | 'winner'>(
    (campaign.winners && campaign.winners.length > 0 && campaign.prizes && campaign.winners.length >= campaign.prizes.length) ? 'winner' : 'idle'
  );
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [currentSpinIndex, setCurrentSpinIndex] = useState<number>(0);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [currentPrizeIndex, setCurrentPrizeIndex] = useState<number>(
    (campaign.winners?.length || 0) < (campaign.prizes?.length || 1) ? (campaign.winners?.length || 0) : 0
  );

  // Canvas confetti ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Is screen recording allowed by Admin?
  const isScreenRecordingAllowedByAdmin = settings.enableScreenRecording !== false;

  // Extract all valid coupons from sales tied to this campaign
  const allCoupons = useMemo(() => {
    return sales
      .filter(s => (s.raffleCampaignId === campaign.id || (s.raffleCoupons && s.raffleCoupons.length > 0)))
      .flatMap(s => {
        const validCoupons = s.raffleCoupons || [];
        return validCoupons.map(couponNumber => {
          let cName = 'Cliente Balcão / Avulso';
          let cPhone = '';
          let cCity = '';
          let cBairro = '';
          let cStreet = '';

          if (s.customerId && s.customerId !== 'def') {
            const found = customers.find(c => c.id === s.customerId);
            if (found) {
              cName = found.name;
              cPhone = found.phone || '';
              cCity = found.city || '';
              cBairro = found.apartment || '';
              cStreet = found.street ? `${found.street}${found.number ? ', ' + found.number : ''}` : '';
            }
          } else if (s.unregisteredCustomer && s.unregisteredCustomer.name) {
            cName = s.unregisteredCustomer.name;
            cPhone = s.unregisteredCustomer.phone || '';
          }

          return {
            couponNumber,
            saleId: s.id,
            saleDate: s.date,
            saleTotal: s.total,
            customerName: cName,
            phone: cPhone,
            city: cCity,
            bairro: cBairro,
            street: cStreet,
            customerId: s.customerId || null
          };
        });
      });
  }, [sales, campaign.id, customers]);

  // Confetti Particle Generator
  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRotation: number;
    }> = [];

    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#facc15'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRotation: (Math.random() - 0.5) * 0.2
      });
    }

    let animationFrame: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let activeCount = 0;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.rotation += p.vRotation;

        if (p.y < canvas.height) {
          activeCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (activeCount > 0) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    render();
  };

  const startScreenRecording = async () => {
    setRecordingErrorMessage('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('SECNOTSUPP');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recordedChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        if (recordedChunks.current.length > 0) {
          const blob = new Blob(recordedChunks.current, { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Sorteio_${campaign.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.mp4`;
          a.click();
          URL.revokeObjectURL(url);
          recordedChunks.current = [];
        }
        setIsRecording(false);
        setRecordingMode(null);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingMode('screen');

      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      };
    } catch (err: any) {
      console.error("Error accessing display media:", err);
      const isPolicyError = err.name === 'NotAllowedError' || err.name === 'SecurityError' || String(err).includes('permissions policy') || err.message === 'SECNOTSUPP';
      if (isPolicyError) {
        setRecordingErrorMessage('A gravação de tela direta está bloqueada pela política do navegador no ambiente de iFrame. Utilize a gravação por Webcam ou abra a página em uma Nova Aba.');
      } else {
        setRecordingErrorMessage('A gravação de tela foi cancelada pelo usuário ou não é suportada neste dispositivo.');
      }
      setRecordingHelpModalOpen(true);
    }
  };

  const startWebcamRecording = async () => {
    setRecordingErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      recordedChunks.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        if (recordedChunks.current.length > 0) {
          const blob = new Blob(recordedChunks.current, { type: 'video/mp4' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Live_Cam_Sorteio_${campaign.title.replace(/\s+/g, '_')}.mp4`;
          a.click();
          URL.revokeObjectURL(url);
          recordedChunks.current = [];
        }
        setIsRecording(false);
        setRecordingMode(null);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingMode('webcam');
      setRecordingHelpModalOpen(false);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Não foi possível acessar a Câmera/Webcam. Verifique as permissões do seu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleStartDrawSequence = () => {
    if (allCoupons.length === 0) {
      alert('Nenhum cupom foi gerado para esta campanha até o momento.');
      return;
    }

    const currentWinnersCount = campaign.winners?.length || 0;
    const totalPrizes = campaign.prizes?.length || 1;
    
    if (currentWinnersCount >= totalPrizes) {
        alert('Todos os prêmios já foram sorteados para esta campanha.');
        return;
    }

    setCurrentPrizeIndex(currentWinnersCount);
    setWinningIndex(null);
    setDrawStage('countdown');
    setCountdownNum(3);

    if (soundEnabled) playTickSound(600);

    let count = 3;
    const countdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNum(count);
        if (soundEnabled) playTickSound(600 + (3 - count) * 100);
      } else {
        clearInterval(countdownTimer);
        startSpinningStage();
      }
    }, 900);
  };

  const startSpinningStage = () => {
    setDrawStage('spinning');

    let totalTicks = 0;
    const maxFastTicks = 50;
    let currentSpeed = 40; 

    const randomPick = Math.floor(Math.random() * allCoupons.length);
    setWinningIndex(randomPick);

    const spin = () => {
      totalTicks++;
      setCurrentSpinIndex(Math.floor(Math.random() * allCoupons.length));

      if (soundEnabled && totalTicks % 2 === 0) {
        playTickSound(300 + (totalTicks % 10) * 40);
      }

      if (totalTicks < maxFastTicks) {
        setTimeout(spin, currentSpeed);
      } else if (totalTicks < maxFastTicks + 20) {
        currentSpeed += 15;
        setTimeout(spin, currentSpeed);
      } else {
        setCurrentSpinIndex(randomPick);
        setDrawStage('revealing');

        setTimeout(() => {
          setDrawStage('winner');
          if (soundEnabled) playFanfareSound();
          triggerConfetti();

          const winnerObj = allCoupons[randomPick];
          if (winnerObj) {
            const currentWinnersCount = campaign.winners?.length || 0;
            const newWinner: CampaignWinner = {
                customerId: winnerObj.customerId || undefined,
                customerName: winnerObj.customerName,
                couponNumber: winnerObj.couponNumber,
                drawDate: new Date().toISOString(),
                customerPhone: winnerObj.phone,
                prizeId: (campaign.prizes || [])[currentWinnersCount]?.id || '1',
                prizeName: (campaign.prizes || [])[currentWinnersCount]?.name || campaign.prize,
                position: currentWinnersCount + 1
            };

            const updatedWinners = [...(campaign.winners || []), newWinner];
            const allPrizes = campaign.prizes?.length || 1;
            
            updateRaffleCampaign(campaign.id, {
                winners: updatedWinners,
                status: updatedWinners.length >= allPrizes ? 'finished' : 'active'
            });

            if (winnerObj.customerId) {
              const targetCustomer = customers.find(c => c.id === winnerObj.customerId);
              if (targetCustomer) {
                const newWin: RaffleWin = {
                    id: Date.now().toString(),
                    campaignId: campaign.id,
                    campaignTitle: campaign.title,
                    prize: newWinner.prizeName,
                    drawDate: new Date().toISOString(),
                    couponNumber: winnerObj.couponNumber
                  };
                  updateCustomer({
                    ...targetCustomer,
                    raffleWins: [...(targetCustomer.raffleWins || []), newWin]
                  });
              }
            }
          }
        }, 600);
      }
    };

    spin();
  };

  const winner = winningIndex !== null && drawStage === 'winner' ? allCoupons[winningIndex] : null;
  const currentPrize = campaign.prizes?.[currentPrizeIndex] || { name: campaign.prize, imageUrl: campaign.prizeImageUrl };

  const handlePrintWinnerProof = (w?: any, pName?: string) => {
    const targetWinner = w || winner;
    if (!targetWinner) return;

    const htmlContent = generateSingleCouponReceiptContent(
      targetWinner.couponNumber,
      campaign.title,
      `${pName || currentPrize.name} (VENCEDOR DO SORTEIO)`,
      settings,
      {
        name: targetWinner.customerName !== 'Cliente Balcão / Avulso' ? targetWinner.customerName : '',
        phone: targetWinner.phone || targetWinner.customerPhone,
        city: targetWinner.city,
        bairro: targetWinner.bairro,
        street: targetWinner.street
      },
      {
        isReprint: false,
        isInvalid: false,
        fillCustomerName: true
      }
    );

    printHtml(htmlContent);
  };

  const handleSendWhatsAppCongrats = (w?: any, pName?: string) => {
    const targetWinner = w || winner;
    const phone = targetWinner?.phone || targetWinner?.customerPhone;
    if (!targetWinner || !phone) {
      alert('Telefone do ganhador não informado ou não cadastrado.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const msg = `🎉 *PARABÉNS! VOCÊ FOI O GANHADOR DO SORTEIO!* 🎉\n\nOlá *${targetWinner.customerName}*!\nSeu cupom *Nº ${targetWinner.couponNumber}* foi o grande sorteado na campanha *${campaign.title}*!\n\n🏆 *Prêmio:* ${pName || currentPrize.name}\n📍 *Loja:* ${settings.name}\n\nEntre em contato para retirar o seu prêmio! 🥳`;

    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl mt-6 max-w-4xl mx-auto w-full relative overflow-y-auto max-h-[90vh] custom-scrollbar animate-fade-in">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50 w-full h-full" />

      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-colors text-sm bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft size={18} /> Voltar
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              soundEnabled ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {isScreenRecordingAllowedByAdmin && (
            !isRecording ? (
              <button onClick={startScreenRecording} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm">
                <Video size={16} /> Gravar Tela
              </button>
            ) : (
              <button onClick={stopRecording} className="flex items-center gap-2 bg-slate-900 text-red-400 px-4 py-2 rounded-xl font-bold text-xs shadow-lg animate-pulse">
                <StopCircle size={16} /> Parar Gravação
              </button>
            )
          )}
        </div>
      </div>

      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-2xl mb-3 border border-amber-200/60 shadow-sm">
          <Trophy size={36} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">{campaign.title}</h2>
        
        {campaign.status !== 'finished' && (
            <p className="text-base text-slate-600 font-semibold">
                Sorteando: <span className="text-amber-600 font-bold">{currentPrize.name}</span>
            </p>
        )}

        {currentPrize.imageUrl && campaign.status !== 'finished' && (
          <img src={currentPrize.imageUrl} alt="Prêmio" className="w-44 h-44 object-cover mx-auto mt-4 rounded-2xl shadow-md border-4 border-amber-100/80" />
        )}

        <div className="mt-5 inline-flex gap-8 px-6 py-3 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="text-center">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cupons na Urna</span>
            <span className="text-2xl font-black text-blue-600">{allCoupons.length}</span>
          </div>
          <div className="w-px bg-slate-200" />
          <div className="text-center">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prêmios Totais</span>
            <span className="text-2xl font-black text-amber-600">{campaign.prizes?.length || 1}</span>
          </div>
        </div>
      </div>

      {campaign.status !== 'finished' && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleStartDrawSequence}
              disabled={drawStage !== 'idle'}
              className={`px-10 py-5 rounded-3xl font-black text-xl shadow-xl transition-all transform flex items-center gap-3.5 border-4 ${
                drawStage === 'idle'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-600 hover:to-amber-700 text-white border-amber-300 hover:scale-105 active:scale-95 shadow-amber-500/20'
                  : 'bg-slate-300 text-slate-500 border-slate-200 cursor-not-allowed opacity-80'
              }`}
            >
              <Ticket size={32} className="animate-bounce" />
              {drawStage === 'idle' && (campaign.winners?.length ? `SORTEAR ${(campaign.winners.length + 1)}º PRÊMIO` : 'INICIAR SORTEIO AGORA')}
              {drawStage === 'countdown' && `SORTEANDO EM ${countdownNum}...`}
              {drawStage === 'spinning' && 'GIRANDO A URNA DIGITAL...'}
              {drawStage === 'revealing' && 'REVELANDO VENCEDOR...'}
              {drawStage === 'winner' && 'SORTEAR PRÓXIMO'}
            </button>
          </div>
      )}

      {drawStage === 'countdown' && (
        <div className="bg-slate-900 rounded-3xl p-10 text-center text-white shadow-2xl border border-slate-800">
          <div className="text-8xl font-black text-amber-400 animate-ping font-mono">
            {countdownNum}
          </div>
        </div>
      )}

      {(drawStage === 'spinning' || drawStage === 'revealing') && (
        <div className="bg-slate-900 rounded-3xl p-8 text-center text-white shadow-2xl border-4 border-amber-500/50">
          <p className="text-amber-300 font-bold text-sm uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
            <Sparkles size={18} className="animate-spin text-amber-400" /> Sorteando: {currentPrize.name}
          </p>
          <div className="bg-slate-950/80 rounded-2xl p-6 border-2 border-amber-500/30 max-w-md mx-auto shadow-inner">
            <div className="text-5xl md:text-6xl font-black text-amber-400 font-mono tracking-widest">
              {allCoupons[currentSpinIndex]?.couponNumber || '000000'}
            </div>
            <p className="text-slate-300 font-bold text-sm mt-3 truncate">
              👤 {allCoupons[currentSpinIndex]?.customerName || 'Carregando...'}
            </p>
          </div>
        </div>
      )}

      {campaign.winners && campaign.winners.length > 0 && (
        <div className="space-y-6 mt-8">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 justify-center">
            <Trophy size={24} className="text-amber-500" /> GANHADORES DA CAMPANHA
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {campaign.winners.map((w, idx) => (
              <div key={idx} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg border-2 border-amber-400/30 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy size={80} />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter mb-2 inline-block">
                            {w.position}º GANHADOR
                        </span>
                        <h4 className="text-lg font-bold text-amber-200">{w.prizeName}</h4>
                        <div className="mt-3 space-y-1">
                            <p className="text-3xl font-black font-mono tracking-widest text-white">{w.couponNumber}</p>
                            <p className="text-sm font-bold flex items-center gap-2 text-slate-200">
                                <User size={14} className="text-amber-400" /> {w.customerName}
                            </p>
                            {w.customerPhone && (
                                <p className="text-xs text-slate-400 flex items-center gap-2">
                                    <Send size={12} /> {w.customerPhone}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                        <button onClick={() => handlePrintWinnerProof(w, w.prizeName)} className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-white/20 transition-colors">
                            <Printer size={14} /> Imprimir
                        </button>
                        {w.customerPhone && (
                            <button onClick={() => handleSendWhatsAppCongrats(w, w.prizeName)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors shadow-md">
                                <Send size={14} /> WhatsApp
                            </button>
                        )}
                    </div>
                </div>
              </div>
            ))}
          </div>
          
          {campaign.status === 'finished' && (
              <div className="text-center py-6">
                  <span className="bg-green-100 text-green-700 px-6 py-2 rounded-2xl font-black text-sm border border-green-200 shadow-sm flex items-center gap-2 mx-auto w-fit">
                      <CheckCircle size={18} /> SORTEIO FINALIZADO
                  </span>
              </div>
          )}
        </div>
      )}

      {recordingHelpModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Video size={20} className="text-red-600" /> Gravação de Tela
              </h3>
              <button onClick={() => setRecordingHelpModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            {recordingErrorMessage && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 mb-4 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>{recordingErrorMessage}</div>
              </div>
            )}
            <div className="space-y-3 mb-6">
              <button onClick={startWebcamRecording} className="w-full p-3 bg-slate-50 hover:bg-slate-100 border rounded-xl flex items-center gap-3 text-left">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Camera size={20} /></div>
                <div>
                  <p className="font-bold text-xs">Gravar via Webcam</p>
                  <p className="text-[10px] text-slate-500">Usa a sua câmera para gravar o sorteio.</p>
                </div>
              </button>
              <button onClick={openInNewTab} className="w-full p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-3 text-left">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ExternalLink size={20} /></div>
                <div>
                  <p className="font-bold text-xs">Abrir em Nova Aba</p>
                  <p className="text-[10px] text-blue-700">Libera a captura de tela nativa.</p>
                </div>
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setRecordingHelpModalOpen(false)} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-xs">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};