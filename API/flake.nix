{
  description = "Run REST-API on NixOS";

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
                    pkgs.docker
                    pkgs.docker-compose
                    pkgs.nodejs
                ];

                shellHook = ''
                  echo "Make sure Docker is running"
                '';
            };
        };
}
