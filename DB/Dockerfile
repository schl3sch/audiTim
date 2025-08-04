FROM nodered/node-red:3.1

# For reference: https://nodered.org/docs/getting-started/docker

# Copy package.json to the WORKDIR so npm builds all
# of your added nodes modules for Node-RED

WORKDIR /data
# If installed nodes have been changed 
# package.json has to be updated with the contents of /data/package.json
COPY package.json /data
RUN npm install --unsafe-perm --no-update-notifier --no-fund
WORKDIR /usr/src/node-red 
# If flow has been changed the exported flow has to be saved in flows.json
COPY flows.json /data/flows.json