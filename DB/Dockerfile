FROM nodered/node-red:3.1

# For reference: https://nodered.org/docs/getting-started/docker

# Copy package.json to the WORKDIR so npm builds all
# of your added nodes modules for Node-RED

WORKDIR /data
COPY package.json /data
RUN npm install --unsafe-perm --no-update-notifier --no-fund --only=production
WORKDIR /usr/src/node-red 
COPY flows.json /data/flows.json