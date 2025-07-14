{
    description = "MQTT Project Environment with PlatformIO";

    inputs = {
        nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    };

    outputs = { self, nixpkgs }: 
        let 
            pkgs = import nixpkgs { system = "x86_64-linux"; };
            system = "x86_64-linux";
        in {
            devShells.x86_64-linux.default = pkgs.mkShell {
                buildInputs = [
                    pkgs.arduino-cli
                    pkgs.arduino-ide
                ];

                shellHook = ''
                    echo develop
                    arduino-ide ~/Documents/GitHub/audiTim > /dev/null 2>&1 &
                '';
            };
        };
}
