import { Utils } from './utils';

export class mapper 
{
    public static generate(file: string): string[] 
    {
        let map = '';

        try 
        {
            let lines = Utils.read_all_lines(file);
            let info = null;
            let line_num = 0;
            let item_line_num = 0; 
            let mymatch = [];
            let lastproc = '';
            let structs = [];
            let procs = [];
            let defs = [];
            let literals = [];
            let items = [];

            let sub_lines = [];
            let continued = true;
            let prev_sub_line = '';
            let last_sub_line = ''; 
            
            let i=0;

            function compfunc (a: any[], b: any[]): number 
            { 
                let comp = 0;
                comp = a[3].localeCompare(b[3]);
                if (comp == 0) 
                {
                    return b[0] - a[0];
                }
                else 
                {
                    return comp;
                }  
            };

            function create_item(item_text: string, icon: string, element: string, terminator: string): void
            {
                let n = 0;
                let sortorder = '';

                if (terminator.length)
                {
                    n = item_text.indexOf(terminator);
               
                    if (n != -1)
                    {
                        item_text = item_text.substr(0, n); 
                    }
                }

                n = item_text.indexOf(element);

                if (n != -1)
                {
                    n = n + element.length;
                    item_text = item_text.substr(n)
                }

                item_text = item_text.trim();

                sortorder = item_text.replace(/\s+/g, '');
                sortorder = sortorder.toLowerCase();

                if (element == 'PROC')
                {
                    lastproc = sortorder;        
                }

                item_text = '  ' + item_text;

                if (element == 'SUBPROC')
                {
                    item_text = '  ' + item_text;
                    sortorder = lastproc + sortorder;        
                }

                info = [item_line_num,
                        item_text,
                        icon,
                        sortorder
                       ];
            }
            
            function create_map(elements:any[],elements_type:string) : void
            {
                let nextmapline = '';
                let currproc = '';
                let prevproc = '';

                if (elements.length)
                {
                    elements.sort(compfunc);
                    map = map + '\n' + elements_type + ' | 0 | \n';

                    create_item("", "", "PROC", "");
                    elements.push(info); 
    
                    elements.forEach(item => 
                    {
                        map = map + nextmapline;
                        if (item[2] == "class") 
                        {
                            currproc = item[3];
                            if (currproc == prevproc) 
                            {
                                nextmapline = '';
                            }
                            else 
                            {
                                nextmapline = item[1] + '|' + String(item[0]) + '|' + item[2] + '\n';
                            }
                            prevproc = currproc;
                        }
                        else 
                        {
                            nextmapline = item[1] + '|' + String(item[0]) + '|' + item[2] + '\n';
                        }
                    });
                }
            }

            function isOdd(x:number) : boolean
            {
                return ( x & 1 ) ? true : false;
            }

            function mend_bad_breaks(elements:string[],breaker:string) : string[] 
            {
                // just in case a breaker is inside a quoted string rather
                // than at the end of a code line
                                
                let i = 0;
                let oddline = false;
                do
                {
                    oddline = false;
                    for (i = 0; i < elements.length - 1; i++) 
                    {   
                        if (breaker != '!' || !isOdd(i))
                        {
                            // is the number of " chars odd?
                            if (isOdd(elements[i].split('"').length - 1))
                            {
                                elements[i] = elements[i] + breaker + elements[i+1];
                                elements.splice(i+1,1);
                                oddline = true;
                                break;
                            }
                        }
                    }
                } while (oddline && elements.length > 1);

                return elements;
            }


            lines.forEach(line => 
            {
                line_num = line_num + 1;

                // remove comments and non code lines
                line = line.replace(/^\?.*$/, '');

                sub_lines = line.split('--');
                sub_lines = mend_bad_breaks(sub_lines,'--');
                line      = sub_lines[0];

                sub_lines = line.split('!');
                sub_lines = mend_bad_breaks(sub_lines,'!');

                line = '';
                for (i = 0; i < sub_lines.length; i++) 
                {
                    if (!isOdd(i))
                    {
                        line = line + sub_lines[i];
                    }
                }

                line = line.trim();

                if (line.length)
                {
                    if (line.substr(-1) != ';')
                    {
                        continued = true;
                    }
                    else
                    {
                        continued = false;
                    }

                    sub_lines = line.split(';');

                    sub_lines = mend_bad_breaks(sub_lines,';');

                    if (continued)
                    {
                        last_sub_line = sub_lines.pop();
                    }

                    sub_lines.forEach(sub_line =>
                    {  
                        if (prev_sub_line.length)
                        {
                            sub_line = prev_sub_line + ' ' + sub_line;
                            prev_sub_line = '';
                        }
                        else
                        {
                            item_line_num = line_num;
                        }
    
                        if (sub_line.length) 
                        {
                            if (mymatch = sub_line.match(/^LITERAL\s*.*$/i))
                            {
                                sub_line = mymatch[0].substr(7);

                                items = sub_line.split(',');
                                items.forEach(item => 
                                {
                                    item = item.trim();
                                    if (item.length && item.split('=').length == 2)
                                    {
                                        item = item.replace(/\s+/g, '');
                                        create_item(item,"level1","LITERAL",'');
                                        literals.push(info);
                                    }
                                });
                            }                    
                            else if (mymatch = sub_line.match(/^STRUCT\s.*\(\s*\*\s*\).*$/i))
                            {
                                create_item(mymatch[0],"function","STRUCT",'');
                                structs.push(info);
                            }
                            else if (mymatch = sub_line.match(
                                /^((INT\s+PROC)|(INT\(.*\)\s+PROC)|(REAL\s+PROC)|(REAL\(.+\)\s*PROC)|(PROC)|(UNSIGNED\(.*\)\s+PROC)|(FIXED\s+PROC)|(FIXED\(.*\)\s+PROC))\s+.*$/i))
                            { 
                                create_item(mymatch[0],"class","PROC",'');
                                procs.push(info);
                            }
                            else if (mymatch = sub_line.match(
                                /^((STRING\s+SUBPROC)|(INT\s+SUBPROC)|(INT\(.*\)\s+SUBPROC)|(REAL\s+SUBPROC)|(REAL\(.+\)\s*SUBPROC)|(SUBPROC)|(UNSIGNED\(.*\)\s+SUBPROC)|(FIXED\s+SUBPROC)|(FIXED\(.*\)\s+SUBPROC))\s+.*$/i))
                            {   
                                create_item(mymatch[0],"property","SUBPROC",'');
                                procs.push(info);
                            }
                            else if (mymatch = sub_line.match(/^DEFINE\s.*=/i))
                            {   
                                create_item(mymatch[0],"interface","DEFINE",'=');
                                defs.push(info);
                            }
                        }
                    });

                    if (last_sub_line.length)
                    {
                        if (prev_sub_line.length)
                        {
                            prev_sub_line = prev_sub_line + ' ' + last_sub_line;
                        }
                        else
                        {
                            prev_sub_line = last_sub_line;
                            item_line_num = line_num;
                        }
                        last_sub_line = '';
                    } 
                }     
            });

            create_map(procs,    "PROCEDURES");
            create_map(defs,     "DEFINES");
            create_map(structs,  "STRUCTURES");
            create_map(literals, "LITERALS");
        } 
        catch (error) 
        {
            map = 'TAL Mapper Error | 0 | \n';
            console.log('TAL Mapper Error');
        }    

        return map.trim().lines();
    }
}