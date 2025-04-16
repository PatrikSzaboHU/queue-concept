import { useEffect, useRef, useState } from 'react'

function App() {
  // Tesztből kell
  const generateRandomUsername = () => {
    const randomNumber = Math.floor(Math.random() * 10000); // You can change the range if needed
    return `user${randomNumber}`;
  };

  const [username, setUsername] = useState(generateRandomUsername());
  const [type, setType] = useState('Szétkapcsolva.')
  const [value, setValue] = useState('Nem vagy kapcsolódva a backendhez.')
  const [isInQueue, setIsInQueue] = useState(false)
  const [isMatchFound, setIsMatchFound] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const socketRef = useRef(null)

  // queueban töltött idő számolása
  useEffect(() => {
    let intervalUpdate;
    if (isInQueue) {
      intervalUpdate = setInterval(() => setTimeElapsed(timeElapsed + 1), 1000)
    }
    return () => clearInterval(intervalUpdate)
  }, [isInQueue, timeElapsed])

  // Mennyi időnként csekkolja hogy él e még a queue
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
    }

    socketRef.current.onclosed = () => {
      setIsInQueue(false)
      setIsMatchFound(false)
      setType("Szétkapcsolva.")
      setValue("A kapcsolat a backenddel megszűnt.")
    }

    // kezeli az üzeneteket
    // mivel ez csak egy concept (aka mivel lusta vagyok), ezért hiányzik validation hogy bizonyos fieldek megvannak e
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
          setTimeElapsed(0)
          setIsInQueue(false);
        } else if (data.type == "queue_alive") {
          // A szöveg frissítése
          setType(`Várakozás játékosokra...`)
          setValue(`Veled együtt ${data.waiting} játékos várakozik.`);
        } else if (data.type == "queue_dead") {
          setType("Nem vagy a queueban.")
          setValue("Jelenleg nem várakozol.")
          setTimeElapsed(0)
          setIsInQueue(false)
        } else if (data.type == "match_found") {
          setIsInQueue(false)
          setIsMatchFound(true)
          setType("Ellenség találva!")
          setValue(data.message)
          // Itt lehetne a kódot frissíteni, hogy csatlakozzon és elindítson
          // pl. egy dinamikusan generált temp. lobbyba ahol lefolyik majd a meccs
        }
      } catch (err) {
        console.error('Invalid JSON:', event.data)
        console.error(err)
      }
    }

    return () => socketRef.current.close()
  }, [])

  const enterQueue = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Tesztből random lvl és power
      socketRef.current.send(JSON.stringify({ type: 'queue_update', username, level: Math.floor(Math.random() * (40 - 10 + 1)) + 10, power_combined: Math.floor(Math.random() * (40 - 10 + 1)) + 10 }))
      setType("Belépés...")
      setValue("Várakozunk a backendre, hogy megerősítse a queue-ba lépést.")
    }
  };

  const checkQueue = () => {
    socketRef.current.send(JSON.stringify({ type: "queue_check", username }));
  }

  return (
    <div className={`queue-info ${isMatchFound ? 'match-found' : ''}`}>
      <h1>{type}</h1>
      <p>{value}</p>
      <button onClick={enterQueue}>
        {isInQueue ? 'Várakozás játékosra...' : 'Enter queue (nem tudom hogy van magyarul 😭)'} {isInQueue ? timeElapsed : ""}
      </button>
    </div>
  )
}

export default App
