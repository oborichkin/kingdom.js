import json
import asyncio
import websockets

PLAYERS = {}
LIVE_CONNECTIONS = set()


def message_all(message):
    websockets.broadcast(LIVE_CONNECTIONS, message)


async def handler(websocket):
    client_id = None

    try:
        message = await websocket.recv()
        event = json.loads(message)
        await websocket.send(json.dumps({
            "type": "init",
            "players": PLAYERS
        }))

        client_id = event["id"]

        message_all(json.dumps({
            "type": "add",
            "id": client_id,
            "x": event["x"],
            "y": event["y"],
            "z": event["z"]}))
        LIVE_CONNECTIONS.add(websocket)

        PLAYERS[client_id] = (event["x"], event["y"], event["z"])

        async for message in websocket:
            print(message)

    finally:
        LIVE_CONNECTIONS.remove(websocket)
        PLAYERS.pop(client_id, None)
        message_all(json.dumps({"type": "remove", "id": client_id}))


async def main():
    async with websockets.serve(handler, "", 8001):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
