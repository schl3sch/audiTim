{
  description = "Run InfluxDB Docker Compose on NixOS";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };
    outputs = { self, nixpkgs }: 
        let 
            pkgs = import nixpkgs { 
              system = "x86_64-linux"; 
              config.allowUnfree = true;
            };
            system = "x86_64-linux";
        in {
            devShells.x86_64-linux.default = pkgs.mkShell {
                buildInputs = [
                    pkgs.docker
                    pkgs.docker-compose
                    pkgs.nodejs
                    pkgs.arduino-cli
                    pkgs.arduino-ide
                    pkgs.mqtt-explorer
                ];

                shellHook = ''
                  alias up='docker-compose up --build -d'
                  alias down='docker-compose down'
                  clean() {
                    docker-compose down
                    docker rm -f $(docker ps -aq)
                    docker rmi -f $(docker images -q)
                    docker volume rm $(docker volume ls -q)
                  }
                  alias mqtt='nohup mqtt-explorer &'
                  ide() {
                    nohup arduino-ide --disable-gpu ~/Documents/GitHub/audiTim/Arduino/edgeDevice/edgeDevice.ino > /dev/null 2>&1 &
                    disown
                  }
                  arduino-cli lib list
                '';
            };
        };
}
