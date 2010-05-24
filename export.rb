# export.rb
# export your code from your central repo to share scripts, plugins etc. 
# currently used for exporting to Mootools Forge format.

require 'rubygems'
require 'json'
require 'yaml'
require 'trollop'
require 'ftools'


module Brawndo
  
  class Export
    
    attr_reader   :included
    attr_accessor :build_path
    attr_accessor :dependency_paths
    attr_accessor :data
    attr_accessor :definition
    
    def initialize(opts={})
      @path             = opts[:path] || File.dirname(__FILE__)
      @build_path       = opts[:build_path]
      @dependency_paths = opts[:dependency_paths] || [@path + '/Source']
      @dependency_file  = opts[:dependency_file] || 'scripts.json'
      
      @scripts  = []
      @included = []
      @data     = {}
      
      @dependency_paths.each do |dependency_path|
        json = JSON.load(File.read( dependency_path[:path] + "/#{@dependency_file}" ))
        json.each_pair do |folder, group|
          group.each_pair do |script, properties|
            @data[script] = {
              :folder => "#{dependency_path[:path]}/#{folder}", 
              :deps => properties["deps"],
              :info => dependency_path[:info]
            }
          end
        end
      end
    end
    
    def copy_script(name)
      unless @data.key? name
        puts "Script '#{name}' not found!"
        throw :script_not_found
      end
      
      File.copy "#{@data[name][:folder]}/#{name}.js", @build_path
    end
    
    def build_requires_and_references
      requires = {}
      references = []
      
      @definition[:scripts].each do |script|        
        @data[script][:deps].each do |dep|        
          repo_name = @data[dep][:info][:name].intern        
          requires[repo_name] ||= []
          requires[repo_name].push(dep) unless requires[repo_name].include? dep          
          references.push @data[dep][:info] unless references.include? @data[dep][:info]
        end
      end
      
      {:references => references, :requires => requires}
    end
    
    def package_file
      build_requires_and_references.merge(@definition).to_yaml
    end
    
    def make_package_file
      File.open(@build_path + '/package.yml', 'w') { |fh| fh.write package_file }
    end

    def self.export(definition, exporter = MooTools::Export.new)
      catch :script_not_found do
        if definition && definition[:scripts] && definition[:scripts].length > 0
          exporter.definition = definition
          exporter.definition[:scripts].each { |script| exporter.copy_script(script) }
          exporter.make_package_file
        else
          puts "No scripts to export."
          throw :no_scripts
        end
      end
      
      puts "Done. Files are in #{exporter.build_path}"
    end
    
  end
  
end


# todo
# make an export-all method to run though the yml and update all plugins
# more useful info on what happened when the script was run

if $0 == __FILE__
  
  opts = Trollop::options do
    opt :build_config,
      "Build Configuration file (YAML file where all the dependency paths live",
      :type => :string,
      :default => File.join(File.dirname(__FILE__), "build.yml")
    opt :plugins,
      "Location of plugins definition file (YAML file defining all the plugins you want to export.", 
      :type => :string, 
      :default => File.join(File.dirname(__FILE__), "plugins.yml"),
      :short => 's'
    opt :plugin,
      "Plugin, from plugins.yml, to build.",
      :type => :string,
      :short => 'p'
    opt :override_list,
      "If not in plugins.yml, a list of scripts to export. Will generate a package.yml with just the requires/references.",
      :type => :string,
      :short => 'l'
    opt :build_path,
      "Directory to copy/make files, created if not there already.",
      :type => :string
  end
  
  Trollop::die "could not find build configuration file at: #{opts[:build_config]}" unless File.exists?(opts[:build_config])
  conf = YAML.load_file(opts[:build_config])
  dependency_paths = conf[:dependency_paths]
  
  Trollop::die "you need to either specify a project a specify overrides." unless opts[:plugins] || opts[:override_list]

  if opts[:project].nil? && opts[:override_list]
    definition = { :scripts => opts[:override_list].split }
  else
    Trollop::die "could not find plugins definition file at: #{opts[:plugins]}" unless File.exists?(opts[:plugins])
    plugins = YAML.load_file(opts[:plugins])
    definition = plugins[:plugins][opts[:plugin].intern]
    definition = plugins[:globals].merge(definition) if plugins[:globals]
    build_path = definition[:build_path]
  end

  build_path = opts[:build_path] || File.dirname(__FILE__) + "/" + definition[:scripts].first
  Dir.mkdir(build_path) unless File.exists?(build_path)
  
  Brawndo::Export.export(
    definition,
    Brawndo::Export.new(
      :dependency_paths => dependency_paths, 
      :build_path => build_path
    )
  )
end