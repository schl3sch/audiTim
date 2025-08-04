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
                  alias mqtt='nohup mqtt-explorer &'
                  ide() {
                    nohup arduino-ide --disable-gpu ~/Documents/GitHub/audiTim/Arduino > /dev/null 2>&1 &
                    disown
                  }
                  arduino-cli lib list
                '';
            };
        };
}
