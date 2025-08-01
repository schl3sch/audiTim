{
    description = "MQTT Project Environment with PlatformIO";

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
                    pkgs.arduino-cli
                    pkgs.arduino-ide
                    pkgs.mqtt-explorer
                ];

                shellHook = ''
                    arduino-cli lib list
                    arduino-ide ~/Documents/GitHub/audiTim > /dev/null 2>&1 &
                '';
            };
        };
}
