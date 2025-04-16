import { useEffect, useRef, useState } from 'react'

function App() {
  const [username, setUsername] = useState("defaultuser0")
  const [type, setType] = useState('Szétkapcsolva.')
  const [value, setValue] = useState('Nem vagy kapcsolódva a backendhez.')
  const [isInQueue, setIsInQueue] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const socketRef = useRef(null)

  useEffect(() => {
    let intervalUpdate;
    if (isInQueue) {
      intervalUpdate = setInterval(() => setTimeElapsed(timeElapsed + 1), 1000)
    }
    return () => clearInterval(intervalUpdate)
  }, [isInQueue, timeElapsed])

  useEffect(() => {
    let intervalUpdate;
    if (isInQueue) {
      intervalUpdate = setInterval(() => checkQueue(), 10000);
    }
    return () => clearInterval(intervalUpdate);
  }, [isInQueue]);  

  useEffect(() => {
    socketRef.current = new WebSocket('ws://localhost:3001')

    socketRef.current.onopen = () => {
      console.log('Connected to server')
      setType("Kapcsolat létesítve.")
      setValue("Kapcsolódva vagy a backendhez.")
      // You can send something if needed:
      // socketRef.current.send(JSON.stringify({ client: 'hello' }))
    }

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type == "queue_accept") {
          setIsInQueue(true)
          setType(`Várakozás játékosokra...`)
          setValue(data.message)
        } else if (data.type == "queue_left") {
          setType("Elhagytad a queue-t.")
          setValue("Jelenleg nem várakozol.")
          setIsInQueue(false);
        } else if (data.type == "queue_alive") {
          // A szöveg frissítése
          setType(`Várakozás játékosokra...`)
          setValue(`Veled együtt ${data.waiting} játékos várakozik.`);
        } else if (data.type == "queue_dead") {
          setType("Nem vagy a queueban.")
          setValue("Jelenleg nem várakozol.")
          setIsInQueue(false);
        }
      } catch (err) {
        console.error('Invalid JSON:', event.data)
      }
    }

    return () => socketRef.current.close()
  }, [])

  const enterQueue = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'queue_update', username, level: 17, power_combined: 20 }))
      setType("Belépés...")
      setValue("Várakozunk a backendre, hogy megerősítse a queue-ba lépést.")
    }
  };

  const checkQueue = () => {
    socketRef.current.send(JSON.stringify({ type: "queue_check", username }));
  }

  return (
    <div className='queue-info'>
      <h1>{type}</h1>
      <p>{value}</p>
      <button onClick={enterQueue}>
        {isInQueue ? 'Várakozás játékosra...' : 'Enter queue (nem tudom hogy van magyarul 😭)'} {isInQueue ? timeElapsed : ""}
      </button>
    </div>
  )
}

export default App
