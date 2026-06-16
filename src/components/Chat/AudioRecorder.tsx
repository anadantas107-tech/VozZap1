import { useEffect, useState, useRef } from 'react'
import { Mic, Send, Loader, X, Link as LinkIcon } from 'lucide-react'
import { Message } from '../../lib/chat-service'

interface AudioRecorderProps {
  conversationId: string
  receiverId: string
  onSend: (message: Message) => void
  disabled?: boolean
}

export function AudioRecorder({ conversationId, receiverId, onSend, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioUrlInput, setAudioUrlInput] = useState('')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Iniciar gravação
  const startRecording = async () => {
    try {
      setError('')
      setIsPreparing(true)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })
      streamRef.current = stream
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data)
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
      }
      
      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setIsPreparing(false)
      setDuration(0)
      
      // Timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    } catch (err) {
      setError('Erro ao acessar microfone. Verifique as permissões.')
      setIsPreparing(false)
      console.error('Erro ao iniciar gravação:', err)
    }
  }

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      
      // Parar stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }

  // Cancelar
  const cancelRecording = () => {
    stopRecording()
    setAudioBlob(null)
    setDuration(0)
  }

  // Enviar áudio
  const sendAudio = async () => {
    if (!audioBlob) return
    
    try {
      setIsPreparing(true)
      
      // Criar FormData para enviar áudio
      const formData = new FormData()
      formData.append('audio', audioBlob, `audio-${Date.now()}.webm`)
      formData.append('conversationId', conversationId)
      formData.append('receiverId', receiverId)
      formData.append('duration', duration.toString())
      
      // Para agora, vamos enviar como fake message
      // Em produção, faria upload para storage antes
      const message: Message = {
        id: `msg-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: '',
        receiver_id: receiverId,
        content: '', // Áudio não tem conteúdo de texto
        audio_url: URL.createObjectURL(audioBlob), // URL local do áudio
        audio_duration: duration,
        created_at: new Date().toISOString(),
        is_read: false,
        read_at: null,
      }
      
      onSend(message)
      setAudioBlob(null)
      setDuration(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar áudio')
    } finally {
      setIsPreparing(false)
    }
  }

  // Enviar URL de áudio
  const sendAudioUrl = async () => {
    if (!audioUrl.trim()) {
      setError('Por favor, insira uma URL de áudio válida')
      return
    }

    try {
      setIsPreparing(true)
      
      // Validar se é uma URL válida
      try {
        new URL(audioUrl)
      } catch {
        setError('URL inválida. Use um link completo (https://...)')
        setIsPreparing(false)
        return
      }

      const message: Message = {
        id: `msg-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: '',
        receiver_id: receiverId,
        content: '',
        audio_url: audioUrl,
        audio_duration: 0, // Não temos duração de URL externa
        created_at: new Date().toISOString(),
        is_read: false,
        read_at: null,
      }
      
      onSend(message)
      setAudioUrl('')
      setAudioUrlInput('')
      setShowUrlInput(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar áudio')
    } finally {
      setIsPreparing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Se tem áudio preparado, mostrar preview
  if (audioBlob) {
    return (
      <div className="audio-preview">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🎵</span>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '0.875rem',
                color: 'var(--text-secondary)'
              }}>
                Áudio gravado
              </div>
              <div style={{ 
                fontSize: '1rem',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                {formatTime(duration)}
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={cancelRecording}
            disabled={isPreparing}
            style={{
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#ef4444'
            }}
          >
            <X size={20} />
          </button>
          
          <button
            type="button"
            onClick={sendAudio}
            disabled={isPreparing}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            {isPreparing ? <Loader size={16} className="spin" /> : <Send size={16} />}
          </button>
        </div>
        
        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  // Se está gravando
  if (isRecording) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '0.5rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          fontSize: '1.5rem',
          animation: 'pulse 1s infinite'
        }}>
          🔴
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
          }}>
            Gravando...
          </div>
          <div style={{ 
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#ef4444'
          }}>
            {formatTime(duration)}
          </div>
        </div>
        
        <button
          type="button"
          onClick={stopRecording}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}
        >
          Pronto
        </button>
      </div>
    )
  }

  // Se está mostrando input de URL
  if (showUrlInput) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          <input
            type="url"
            value={audioUrlInput}
            onChange={(e) => {
              setAudioUrlInput(e.target.value)
              setAudioUrl(e.target.value)
            }}
            placeholder="https://exemplo.com/audio.mp3"
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--text)',
              fontSize: '0.875rem',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--green)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 211, 102, .14)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          
          <button
            onClick={sendAudioUrl}
            disabled={isPreparing || !audioUrlInput.trim()}
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--green)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.875rem'
            }}
          >
            {isPreparing ? <Loader size={16} className="spin" /> : <Send size={16} />}
          </button>

          <button
            onClick={() => {
              setShowUrlInput(false)
              setAudioUrlInput('')
              setAudioUrl('')
              setError('')
            }}
            style={{
              padding: '0.75rem',
              background: 'transparent',
              color: '#ef4444',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            borderRadius: '0.5rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  // Botão para iniciar gravação
  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '1rem',
      flexWrap: 'wrap'
    }}>
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled || isPreparing}
        style={{
          flex: 1,
          minWidth: '180px',
          padding: '0.75rem 1rem',
          background: 'var(--accent)',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontWeight: '600',
          fontSize: '1rem'
        }}
      >
        {isPreparing ? (
          <>
            <Loader size={20} className="spin" />
            Iniciando...
          </>
        ) : (
          <>
            <Mic size={20} />
            Gravar Áudio
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => setShowUrlInput(true)}
        disabled={disabled || isPreparing}
        style={{
          flex: 1,
          minWidth: '150px',
          padding: '0.75rem 1rem',
          background: 'rgba(37, 211, 102, 0.2)',
          color: 'var(--green)',
          border: '2px solid var(--green)',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontWeight: '600',
          fontSize: '1rem'
        }}
      >
        <LinkIcon size={20} />
        Colar URL
      </button>
      
      {error && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          padding: '1rem',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          maxWidth: '300px'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
